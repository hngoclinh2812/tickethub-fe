# TicketHub – Frontend

Giao diện web bán vé TicketHub, dùng làm ví dụ cho chuyên đề tốt nghiệp về load balancing trên AWS (ALB, Auto Scaling, SQS, RDS Multi-AZ). App được giữ tối giản: mỗi tính năng phục vụ việc chứng minh ít nhất một dịch vụ AWS.

## Tech stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4
- Recharts (biểu đồ), lucide-react (icon)
- Giao diện ban đầu được gen bằng Figma Make

## Tính năng

**Trang Sự kiện**
- Lưới thẻ sự kiện: tên, ngày giờ, địa điểm, giá (VND), thanh tiến độ "Còn X / Y vé", nút "Mua vé" (khoá khi hết vé).
- Số vé còn lại tự cập nhật mỗi 3 giây.
- Checkout modal: Họ tên, Email, Số điện thoại, Số lượng 1–4, tổng tiền; badge số vé còn lại cập nhật mỗi 2 giây.
- Sau khi gửi đơn, polling trạng thái mỗi 1 giây: `PENDING` → `CONFIRMED` / `FAILED`, kèm instance xử lý.

**Trang Demo Load Balancing**
- Phân bổ request: gửi N (1–200) `GET /api/whoami` song song, có chế độ chạy liên tục; thống kê, biểu đồ theo instance/AZ, bảng 20 request gần nhất.
- Mô phỏng người mua khác: bắn N (1–500) `POST /api/orders` để thử kịch bản flash sale, không bán vượt số vé.

Footer hiển thị instance và AZ đang phục vụ.

## API

Toàn bộ lời gọi API nằm trong `src/api.ts`.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/events` | Danh sách sự kiện |
| GET | `/api/events/{id}` | Một sự kiện (số vé còn lại) |
| POST | `/api/orders` | Tạo đơn, trả `202 {orderId, instanceId, az}` |
| GET | `/api/orders/{id}` | Trạng thái đơn |
| GET | `/api/whoami` | Instance và AZ đang phục vụ |

### Mock mode

Trong `src/api.ts`, đặt `USE_MOCK = true` để chạy FE không cần BE: dữ liệu giả gồm 6 sự kiện, delay 100–400 ms, 2 instance ngẫu nhiên, đơn `PENDING` khoảng 2 giây rồi `CONFIRMED`/`FAILED`. Sự kiện "Flash Sale – Concert Demo" có 5 vé và một bot mua 1 vé mỗi 3 giây.

Đặt `USE_MOCK = false` để gọi BE thật.

## Chạy local (dev)

Yêu cầu: Node.js 22. Dự án dùng **pnpm** (phiên bản ghim trong `packageManager` của `package.json`); không dùng `npm install`.

```bash
corepack enable   # chạy một lần, tự cài đúng phiên bản pnpm
pnpm install
pnpm dev
```

Mở http://localhost:5173. Vite proxy `/api` về BE tại `http://localhost:8080` (cấu hình trong `vite.config.ts`).

Build production:

```bash
pnpm build      # output: dist/
pnpm preview
```

## Chạy bằng Docker

Image build bằng Node rồi phục vụ file tĩnh qua Nginx — cùng image sẽ push lên ECR.

```bash
docker compose up -d --build
```

Mở http://localhost:3000. Nginx chuyển `/api/*` sang `BACKEND_URL` (mặc định `http://host.docker.internal:8080`, tức BE chạy trên máy host). Đổi khi cần:

```bash
BACKEND_URL=http://192.168.1.10:8080 docker compose up -d
```

## Triển khai AWS

- Image FE được push lên ECR và chạy trên EC2 trong Auto Scaling Group.
- ALB định tuyến `/api/*` → BE, `/*` → FE, nên FE không cần đổi cấu hình giữa local và AWS.
- Chi tiết các bước dựng hạ tầng: xem runbook `docs/deploy.md` trong repo chính.

## Cấu trúc thư mục

```
tickethub-fe/
├── public/                     # favicon
├── src/
│   ├── api.ts                  # toàn bộ API + cờ USE_MOCK + mock store
│   ├── App.tsx                 # 2 trang, navbar, footer, checkout modal
│   ├── index.css               # Tailwind + style chung
│   └── main.tsx                # entrypoint React
├── nginx/default.conf.template # cấu hình Nginx cho image Docker
├── Dockerfile
├── docker-compose.yml
├── index.html
├── vite.config.ts
└── package.json
```

## Việc còn lại

### Kiểm tra sau khi dọn khỏi Figma Make

- [ ] `pnpm build` chạy không lỗi (đã sửa 4 lỗi cú pháp trong `api.ts` / `App.tsx`, nhưng chưa build thử được bằng Vite).
- [ ] `docker compose up -d --build`, mở `http://localhost:3000` thấy giao diện.

### Nối với backend thật (`tickethub-service`)

- [ ] Đặt `USE_MOCK = false` trong `src/api.ts`, chạy BE ở cổng 8080 rồi `pnpm dev`.
- [ ] Đổi kiểu `id` của `EventItem` từ `string` sang `number` (BE trả `id: 1`), cập nhật `eventId` trong `createOrder` và các mock event cho khớp.
- [ ] Sửa badge Flash sale: hiện so cứng `event.id === "flash-sale"`, sẽ mất khi dùng id số của BE. Có thể dựa vào tên sự kiện hoặc số vé (`total`/`remaining`) thay vì id.
- [ ] Footer: đọc header `X-Instance-Id` / `X-Az` từ response gần nhất trong hàm `request()`, thay vì chỉ gọi `whoami` một lần lúc tải trang.
- [ ] Thêm `timestamp` vào kiểu `Instance` (BE trả `{instanceId, az, timestamp}`).
- [ ] Kiểm tra luồng đặt vé end-to-end: `PENDING` → `CONFIRMED` / `FAILED`, hiển thị đúng instance xử lý đơn.

### Mock mode và trang Demo

- [ ] Mock: xử lý mọi đơn `PENDING` đã đến hạn mỗi khi mock nhận request bất kỳ, không chỉ khi có người polling đơn đó. Hiện các đơn bắn đồng loạt ở trang Demo không trừ vé, nên kịch bản "hết vé trong lúc điền form" không chạy.
- [ ] Mục "Mô phỏng người mua khác": cập nhật số vé còn lại mỗi 1 giây (hiện là 2 giây).

### Khác

- [ ] Thay `public/favicon.svg` mặc định của Figma Make bằng icon TicketHub.
- [ ] Push repo lên GitHub (đã `git init`).
