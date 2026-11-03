import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  MapPin,
  RefreshCw,
  Send,
  Server,
  Ticket,
  Trash2,
  X,
  Zap,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { api, type EventItem, type Instance, type Order } from "./api"

type Page = "events" | "demo"
type RequestLog = Instance & {
  id: number
  time: string
  status: "Thành công" | "Lỗi"
  latency: number
}

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
})
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger"
}) {
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200"
      : variant === "danger"
        ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function EventCard({ event, onBuy }: { event: EventItem; onBuy: () => void }) {
  const sold = event.total - event.remaining
  const progress = Math.max(0, Math.min(100, (sold / event.total) * 100))
  return (
    <article className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.03)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="mb-5 flex items-start justify-between">
        <span className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
          <Ticket size={20} />
        </span>
        {event.id === "flash-sale" && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
            <Zap size={12} fill="currentColor" /> Flash sale
          </span>
        )}
      </div>
      <h3 className="min-h-14 text-lg font-bold leading-7 text-slate-900">
        {event.name}
      </h3>
      <div className="mt-4 space-y-2.5 text-sm text-slate-500">
        <p className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 shrink-0 text-slate-400" size={16} />
          <span>{dateFormat.format(new Date(event.date))}</span>
        </p>
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 shrink-0 text-slate-400" size={16} />
          <span>{event.venue}</span>
        </p>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xl font-extrabold tracking-tight text-indigo-600">
          {money.format(event.price)}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">
            Còn {event.remaining} / {event.total} vé
          </span>
          <span className="text-slate-400">{Math.round(progress)}% đã bán</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${
              event.remaining < 10 ? "bg-amber-500" : "bg-indigo-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <Button
        className="mt-5 w-full"
        disabled={event.remaining === 0}
        onClick={onBuy}
      >
        {event.remaining === 0 ? "Hết vé" : "Mua vé"}
      </Button>
    </article>
  )
}

function PurchaseModal({
  event,
  onClose,
}: {
  event: EventItem
  onClose: () => void
}) {
  const [quantity, setQuantity] = useState(1)
  const [remaining, setRemaining] = useState(event.remaining)
  const [order, setOrder] = useState<Order | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (order) return
    const refresh = () =>
      api
        .getEvent(event.id)
        .then((item) => setRemaining(item.remaining))
        .catch(() => {})
    const timer = window.setInterval(refresh, 2000)
    return () => window.clearInterval(timer)
  }, [event.id, order])

  useEffect(() => {
    if (!order || order.status !== "PENDING") return
    const timer = window.setInterval(() => {
      api
        .getOrder(order.orderId)
        .then(setOrder)
        .catch(() => setError("Không thể cập nhật trạng thái đơn hàng."))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [order])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    const data = new FormData(e.currentTarget)
    try {
      const created = await api.createOrder({
        eventId: event.id,
        quantity,
        fullName: String(data.get("fullName")),
        email: String(data.get("email")),
        phone: String(data.get("phone")),
      })
      setOrder({ ...created, status: "PENDING" })
    } catch {
      setError("Không thể gửi đơn hàng. Vui lòng thử lại.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-indigo-600">
              Đặt vé
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {event.name}
            </h2>
          </div>
          <button
            aria-label="Đóng"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {order ? (
          <div className="px-6 py-10 text-center">
            {order.status === "PENDING" && (
              <>
                <RefreshCw
                  className="mx-auto animate-spin text-indigo-600"
                  size={42}
                />
                <h3 className="mt-5 text-xl font-bold">Đang xử lý đơn hàng</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Hệ thống đang kiểm tra và giữ vé cho bạn.
                </p>
              </>
            )}
            {order.status === "CONFIRMED" && (
              <>
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check size={30} strokeWidth={3} />
                </span>
                <h3 className="mt-5 text-xl font-bold">Đặt vé thành công</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Thông tin vé đã được gửi đến email của bạn.
                </p>
              </>
            )}
            {order.status === "FAILED" && (
              <>
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <CircleAlert size={28} />
                </span>
                <h3 className="mt-5 text-xl font-bold">
                  Rất tiếc, vé đã hết trong lúc bạn đặt
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Đơn hàng không bị tính phí.
                </p>
              </>
            )}
            <div className="mx-auto mt-6 max-w-xs rounded-xl bg-slate-50 px-4 py-3 text-left text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Mã đơn hàng</span>
                <strong className="font-mono text-slate-700">
                  {order.orderId}
                </strong>
              </div>
              <div className="mt-2 flex justify-between">
                <span>Xử lý bởi</span>
                <strong className="font-mono text-slate-700">
                  {order.instanceId}
                </strong>
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
            <Button variant="secondary" className="mt-6" onClick={onClose}>
              <ArrowLeft size={16} /> Quay lại sự kiện
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6">
            <div
              className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 ${
                remaining < 10
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <span className="text-sm font-medium text-slate-600">
                Tình trạng trực tiếp
              </span>
              <span
                className={`flex items-center gap-2 text-sm font-bold ${
                  remaining < 10 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                <span className="size-2 animate-pulse rounded-full bg-current" />{" "}
                Còn {remaining} vé
              </span>
            </div>
            <div className="grid gap-4">
              <label className="field-label">
                Họ tên
                <input
                  name="fullName"
                  required
                  placeholder="Nguyễn Văn An"
                  className="field-input"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  Email
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="an@email.com"
                    className="field-input"
                  />
                </label>
                <label className="field-label">
                  Số điện thoại
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="09xx xxx xxx"
                    className="field-input"
                  />
                </label>
              </div>
              <label className="field-label">
                Số lượng
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="field-input"
                >
                  {[1, 2, 3, 4].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            {remaining < quantity && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                <CircleAlert size={16} /> Số vé còn lại không đủ
              </p>
            )}
            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
              <div>
                <p className="text-xs text-slate-500">Tổng cộng</p>
                <p className="text-xl font-extrabold text-slate-900">
                  {money.format(event.price * quantity)}
                </p>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}{" "}
                Xác nhận đặt vé
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [selected, setSelected] = useState<EventItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const refresh = () =>
      api
        .getEvents()
        .then(setEvents)
        .finally(() => setLoading(false))
    refresh()
    const timer = window.setInterval(refresh, 3000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-18">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-indigo-600">
              <span className="h-px w-6 bg-indigo-500" /> Sự kiện nổi bật
            </p>
            <h1 className="text-4xl font-black tracking-[-.035em] text-slate-950 sm:text-5xl">
              Chọn trải nghiệm.
              <br />
              <span className="text-slate-400">Đặt vé trong vài giây.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
              Nền tảng bán vé hiệu năng cao, được thiết kế để luôn sẵn sàng ngay
              cả trong những đợt mở bán đông nhất.
            </p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Sự kiện sắp tới
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {events.length} sự kiện đang mở bán
            </p>
          </div>
          <span className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">
            <RefreshCw size={13} /> Cập nhật mỗi 3 giây
          </span>
        </div>
        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-400">
            <RefreshCw className="animate-spin" />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onBuy={() => setSelected(event)}
              />
            ))}
          </div>
        )}
      </section>
      {selected && (
        <PurchaseModal event={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "indigo",
}: {
  label: string
  value: string | number
  icon: React.ElementType
  tone?: "indigo" | "emerald" | "rose" | "amber"
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <span className={`rounded-lg p-2 ${colors[tone]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  )
}

function DemoPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [count, setCount] = useState(20)
  const [continuous, setContinuous] = useState(false)
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [running, setRunning] = useState(false)
  const [eventId, setEventId] = useState("")
  const [orderCount, setOrderCount] = useState(20)
  const [blast, setBlast] = useState({ sent: 0, accepted: 0, errors: 0 })
  const [blasting, setBlasting] = useState(false)
  const runRef = useRef(false)

  const refreshEvents = () => api.getEvents().then((data) => {
      setEvents(data)
      setEventId((id) => id || data[0]?.id || "")
    })
  useEffect(() => {
    refreshEvents()
    const timer = window.setInterval(refreshEvents, 2000)
    return () => window.clearInterval(timer)
  }, [])

  async function sendRequests() {
    if (runRef.current) return
    runRef.current = true
    setRunning(true)
    const results = await Promise.all(
      Array.from({ length: count }, async (_, index): Promise<RequestLog> => {
        const start = performance.now()
        try {
          const instance = await api.whoAmI()
          return {
            ...instance,
            id: Date.now() + index,
            time: new Date().toLocaleTimeString("vi-VN"),
            status: "Thành công",
            latency: Math.round(performance.now() - start),
          }
        } catch {
          return {
            instanceId: "—",
            az: "—",
            id: Date.now() + index,
            time: new Date().toLocaleTimeString("vi-VN"),
            status: "Lỗi",
            latency: Math.round(performance.now() - start),
          }
        }
      }),
    )
    setLogs((current) => [...results, ...current])
    setRunning(false)
    runRef.current = false
  }

  useEffect(() => {
    if (!continuous) return
    sendRequests()
    const timer = window.setInterval(sendRequests, 2000)
    return () => window.clearInterval(timer)
  }, [continuous, count])

  async function blastOrders() {
    setBlasting(true)
    setBlast({ sent: orderCount, accepted: 0, errors: 0 })
    const results = await Promise.allSettled(
      Array.from({ length: orderCount }, (_, index) =>
        api.createOrder({
          eventId,
          quantity: 1,
          fullName: `Load Test ${index + 1}`,
          email: `test${index + 1}@tickethub.vn`,
          phone: "0900000000",
        }),
      ),
    )
    const accepted = results.filter(
      (item) => item.status === "fulfilled",
    ).length
    setBlast({ sent: orderCount, accepted, errors: orderCount - accepted })
    setBlasting(false)
    window.setTimeout(refreshEvents, 2400)
  }

  const success = logs.filter((item) => item.status === "Thành công").length
  const errors = logs.length - success
  const avg = logs.length
    ? Math.round(
        logs.reduce((sum, item) => sum + item.latency, 0) / logs.length,
      )
    : 0
  const chartData = useMemo(
    () =>
      Object.values(
        logs.reduce<Record<string, { name: string; requests: number }>>(
          (acc, item) => {
            const name = `${item.instanceId} · ${item.az.replace("ap-southeast-", "")}`
            acc[name] = acc[name] ?? { name, requests: 0 }
            acc[name].requests++
            return acc
          },
          {},
        ),
      ),
    [logs],
  )
  const selectedEvent = events.find((item) => item.id === eventId)

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-9">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">
          AWS Architecture Lab
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Demo Load Balancing
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Quan sát cách Application Load Balancer phân phối request và xử lý
          tranh chấp vé giữa nhiều instance.
        </p>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                A
              </span>
              <h2 className="text-lg font-bold">Phân phối request</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Gửi đồng thời đến endpoint /api/whoami
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="field-label w-28">
              Số request
              <input
                type="number"
                min="1"
                max="200"
                value={count}
                onChange={(e) =>
                  setCount(Math.min(200, Math.max(1, Number(e.target.value))))
                }
                className="field-input"
              />
            </label>
            <Button onClick={sendRequests} disabled={running}>
              <Send size={15} /> Gửi request
            </Button>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={continuous}
                onChange={(e) => setContinuous(e.target.checked)}
                className="accent-indigo-600"
              />{" "}
              Chạy liên tục
            </label>
            <Button variant="danger" onClick={() => setLogs([])}>
              <Trash2 size={15} /> Xoá
            </Button>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Tổng request"
            value={logs.length}
            icon={Activity}
          />
          <MetricCard
            label="Thành công"
            value={success}
            icon={Check}
            tone="emerald"
          />
          <MetricCard
            label="Lỗi"
            value={errors}
            icon={CircleAlert}
            tone="rose"
          />
          <MetricCard
            label="Độ trễ TB"
            value={`${avg} ms`}
            icon={Clock3}
            tone="amber"
          />
        </div>
        <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-4 text-sm font-bold">Request theo instance</h3>
            <div className="h-64">
              {chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -25, right: 8 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar
                      dataKey="requests"
                      fill="#4f46e5"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Chưa có dữ liệu
                </div>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-bold">20 request gần nhất</h3>
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    <th>Thời gian</th>
                    <th>Instance</th>
                    <th>AZ</th>
                    <th>Trạng thái</th>
                    <th className="text-right">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 20).map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td>{row.time}</td>
                      <td className="font-mono font-semibold">
                        {row.instanceId}
                      </td>
                      <td>{row.az}</td>
                      <td>
                        <span
                          className={
                            row.status === "Thành công"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="text-right font-mono">{row.latency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!logs.length && (
                <p className="py-16 text-center text-sm text-slate-400">
                  Nhấn “Gửi request” để bắt đầu
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-white">
              B
            </span>
            <h2 className="text-lg font-bold">Mô phỏng người mua khác</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Tạo tải đồng thời để kiểm thử race condition khi giữ vé.
          </p>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <label className="field-label">
              Sự kiện
              <div className="relative">
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="field-input appearance-none pr-9"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-3 text-slate-400"
                />
              </div>
            </label>
            <label className="field-label">
              Số đơn
              <input
                type="number"
                min="1"
                max="500"
                value={orderCount}
                onChange={(e) =>
                  setOrderCount(
                    Math.min(500, Math.max(1, Number(e.target.value))),
                  )
                }
                className="field-input"
              />
            </label>
          </div>
          <Button
            className="min-w-44"
            onClick={blastOrders}
            disabled={blasting || !eventId}
          >
            {blasting ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Zap size={16} />
            )}{" "}
            Bắn đơn đồng loạt
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Đã gửi</p>
            <p className="mt-1 text-xl font-bold">{blast.sent}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Đã tiếp nhận</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {blast.accepted}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Lỗi</p>
            <p className="mt-1 text-xl font-bold text-rose-600">
              {blast.errors}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Vé còn lại</p>
            <p
              className={`mt-1 text-xl font-bold ${
                (selectedEvent?.remaining ?? 0) < 10
                  ? "text-amber-600"
                  : "text-indigo-600"
              }`}
            >
              {selectedEvent?.remaining ?? "—"}{" "}
              <span className="text-xs font-medium text-slate-400">
                / {selectedEvent?.total ?? "—"}
              </span>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>("events")
  const [instance, setInstance] = useState<Instance | null>(null)
  useEffect(() => {
    api
      .whoAmI()
      .then(setInstance)
      .catch(() => {})
  }, [])
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <button
            onClick={() => setPage("events")}
            className="flex items-center gap-2.5"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Ticket size={19} strokeWidth={2.5} />
            </span>
            <span className="text-lg font-black tracking-tight">
              Ticket<span className="text-indigo-600">Hub</span>
            </span>
          </button>
          <nav className="flex h-full items-center gap-1">
            <button
              onClick={() => setPage("events")}
              className={`nav-link ${
                page === "events" ? "nav-link-active" : ""
              }`}
            >
              Sự kiện
            </button>
            <button
              onClick={() => setPage("demo")}
              className={`nav-link ${page === "demo" ? "nav-link-active" : ""}`}
            >
              <Server size={15} /> Demo Load Balancing
            </button>
          </nav>
        </div>
      </header>
      {page === "events" ? <EventsPage /> : <DemoPage />}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© 2026 TicketHub · Demo phục vụ mục đích nghiên cứu</p>
          <p className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Phục vụ
            bởi:{" "}
            <strong className="font-mono font-semibold text-slate-700">
              {instance?.instanceId ?? "đang kết nối"} ({instance?.az ?? "—"})
            </strong>
          </p>
        </div>
      </footer>
    </div>
  )
}
