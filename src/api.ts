export type EventItem = {
  id: string
  name: string
  date: string
  venue: string
  price: number
  total: number
  remaining: number
}

export type OrderStatus = "PENDING" | "CONFIRMED" | "FAILED"

export type Order = {
  orderId: string
  status: OrderStatus
  instanceId: string
  az: string
}

export type Instance = { instanceId: string; az: string }

const USE_MOCK = true
const instances: Instance[] = [
  { instanceId: "i-0a1b", az: "ap-southeast-1a" },
  { instanceId: "i-0e4f", az: "ap-southeast-1b" },
]

const events: EventItem[] = [
  {
    id: "flash-sale",
    name: "Flash Sale – Concert Demo",
    date: "2026-06-20T19:30:00+07:00",
    venue: "Nhà thi đấu Phú Thọ, TP.HCM",
    price: 350000,
    total: 50,
    remaining: 5,
  },
  {
    id: "cloud-next",
    name: "Vietnam Cloud Next 2026",
    date: "2026-07-04T08:30:00+07:00",
    venue: "Thiskyhall Sala, TP.HCM",
    price: 490000,
    total: 250,
    remaining: 184,
  },
  {
    id: "jazz-river",
    name: "Jazz by the River",
    date: "2026-07-12T19:00:00+07:00",
    venue: "Nhà hát Bến Thành, TP.HCM",
    price: 620000,
    total: 120,
    remaining: 72,
  },
  {
    id: "design-week",
    name: "Saigon Design Week",
    date: "2026-08-01T09:00:00+07:00",
    venue: "Gem Center, TP.HCM",
    price: 280000,
    total: 180,
    remaining: 103,
  },
  {
    id: "indie-night",
    name: "Indie Night: Thành phố mơ",
    date: "2026-08-15T20:00:00+07:00",
    venue: "Youth Cultural House, TP.HCM",
    price: 420000,
    total: 90,
    remaining: 0,
  },
  {
    id: "serverless-day",
    name: "Serverless Day Vietnam",
    date: "2026-09-05T08:00:00+07:00",
    venue: "National Convention Center, Hà Nội",
    price: 550000,
    total: 300,
    remaining: 241,
  },
]

type StoredOrder = Order & {
  eventId: string
  quantity: number
  resolveAt: number
}
const orders = new Map<string, StoredOrder>()
let orderCounter = 1000
let botStarted = false

function pickInstance() {
  return instances[Math.floor(Math.random() * instances.length)]
}

function delay() {
  return new Promise((resolve) =>
    setTimeout(resolve, 100 + Math.random() * 300),
  )
}

function resolveOrder(order: StoredOrder) {
  if (order.status !== "PENDING" || Date.now() < order.resolveAt) return
  const event = events.find((item) => item.id === order.eventId)
  if (event && event.remaining >= order.quantity) {
    event.remaining -= order.quantity
    order.status = "CONFIRMED"
  } else {
    order.status = "FAILED"
  }
}

function startBot() {
  if (botStarted) return
  botStarted = true
  window.setInterval(() => {
    const event = events.find((item) => item.id === "flash-sale")
    if (event && event.remaining > 0) event.remaining -= 1
  }, 3000)
}

async function mockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  startBot()
  await delay()
  if (path === "/api/events" && !init?.method) {
    return structuredClone(events) as T
  }
  if (path.startsWith("/api/events/") && !init?.method) {
    const event = events.find((item) => item.id === path.split("/").pop())
    if (!event) throw new Error("Không tìm thấy sự kiện")
    return structuredClone(event) as T
  }
  if (path === "/api/whoami" && !init?.method) return pickInstance() as T
  if (path === "/api/orders" && init?.method === "POST") {
    const body = JSON.parse(String(init.body)) as {
      eventId: string
      quantity: number
    }
    if (!events.some((item) => item.id === body.eventId))
      throw new Error("Sự kiện không hợp lệ")
    const instance = pickInstance()
    const order: StoredOrder = {
      orderId: `ORD-${++orderCounter}`,
      status: "PENDING",
      eventId: body.eventId,
      quantity: body.quantity,
      resolveAt: Date.now() + 2000,
      ...instance,
    }
    orders.set(order.orderId, order)
    return { orderId: order.orderId, ...instance } as T
  }
  if (path.startsWith("/api/orders/") && !init?.method) {
    const order = orders.get(path.split("/").pop() ?? "")
    if (!order) throw new Error("Không tìm thấy đơn hàng")
    resolveOrder(order)
    const { orderId, status, instanceId, az } = order
    return { orderId, status, instanceId, az } as T
  }
  throw new Error(`API không hỗ trợ: ${path}`)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCK) return mockRequest<T>(path, init)
  const response = await fetch(path, init)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

export const api = {
  getEvents: () => request<EventItem[]>("/api/events"),
  getEvent: (id: string) => request<EventItem>(`/api/events/${id}`),
  whoAmI: () => request<Instance>("/api/whoami"),
  createOrder: (body: {
    eventId: string
    quantity: number
    fullName: string
    email: string
    phone: string
  }) =>
    request<{ orderId: string; instanceId: string; az: string }>("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  getOrder: (id: string) => request<Order>(`/api/orders/${id}`),
}
