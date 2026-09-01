# Qareeb

> A modern local-services platform connecting people with trusted nearby helpers.

Qareeb is designed around a simple idea: **help should be close, trusted, and easy to book.** The platform brings discovery, booking, real-time task progress, payments, and reviews into one experience.

## ✨ What it does

- 🔎 Discover nearby services and helpers
- 📍 Location-aware helper discovery and tracking
- 📅 Book services with clear task details
- 🛡️ Identity and trust-focused verification flows
- 💳 Digital payment workflow support
- 📦 Track task progress from booking to completion
- ⭐ Rate and review completed services
- 👩‍💼 Helper onboarding and service management
- 📱 Responsive experience for desktop and mobile

## 🧭 Core user flow

```text
Discover service
      ↓
Choose location & task
      ↓
Review verified helpers
      ↓
Book service
      ↓
Track helper / task progress
      ↓
Complete task & payment
      ↓
Rate and review
```

## 🏗️ Technology

- React
- Vite
- TypeScript
- React Router
- Tailwind CSS
- Zustand
- Lucide React
- Recharts
- Supabase-ready architecture

## 🔐 Security principles

Qareeb is designed with privacy and secure access in mind. Production deployments should keep credentials server-side or in managed environment secrets, enforce authorization at the data layer, and never expose service-role keys in client-side code.

See [SECURITY.md](SECURITY.md) for the security policy.

## 🚀 Getting started

### Requirements

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Configure environment

Create a local environment file based on the variables required by the application. Never commit real credentials.

```bash
cp .env.example .env.local
```

### Run locally

```bash
npm run dev
```

### Production build

```bash
npm run build
npm run preview
```

## 📁 Project quality

The repository is intended to remain production-oriented: reusable components, clear data boundaries, environment-based configuration, and documented security practices should be preferred over hard-coded secrets or one-off implementations.

## 🗺️ Roadmap

- [ ] Production-grade authentication and authorization
- [ ] Verified helper onboarding
- [ ] Robust booking concurrency protection
- [ ] Live location/tracking integration
- [ ] Production payment gateway integration
- [ ] Automated tests and CI
- [ ] Accessibility and performance audit
- [ ] Production deployment

## 🤝 Contributing

Contributions, bug reports, and improvements are welcome. Please keep changes focused, avoid committing secrets, and document meaningful architectural changes.

## 📄 License

License information will be added before public production distribution.

---

**Qareeb — help is always near.**