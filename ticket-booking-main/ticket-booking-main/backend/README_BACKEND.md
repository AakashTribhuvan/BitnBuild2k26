# FairDrop Backend API

## Endpoints

### Auth
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login to get JWT
- `POST /auth/verify-email` - Verify email address
- `GET /auth/me` - Get current user profile

### Events
- `GET /events` - Get all events
- `GET /events/:id` - Get event details

### Queue
- `POST /queue/join` - Join the waiting room
- `GET /queue/status` - Check queue position
- `POST /queue/shuffle` (Admin) - Shuffle queue at sale start

### Seats
- `GET /seats/available` - Get available seats
- `POST /seats/hold` - Hold a seat temporarily
- `DELETE /seats/hold/:seatId` - Release a held seat

### Reservations
- `GET /reservations` - List user reservations
- `GET /reservations/:id` - Get reservation details

### Payments
- `POST /payments/create-intent` - Create mock payment intent
- `POST /payments/webhook` - Webhook for payment processing
- `POST /payments/mock-success` - Mock payment success for demo

### Admin
- `GET /admin/stats` - Seat and queue stats
- `GET /admin/flags` - Risk flags
- `GET /admin/orders` - View orders
