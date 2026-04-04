# 🧠 Project Brain

## 🎯 Goal
Build a clean, working full-stack web app for hackathon.

## 🧱 Stack
- Frontend: React + Tailwind + DaisyUI
- Backend: Node.js + Express
- Database: PostgreSQL

---

## ⚙️ Rules for ALL AI Tools (Cursor / Codex / ChatGPT)

1. ALWAYS generate minimal working code first (MVP only)
2. DO NOT generate full project at once
3. DO NOT overwrite entire files unless asked
4. ALWAYS explain errors briefly when fixing
5. Prefer simple, readable code over complex logic
6. Use PostgreSQL (pg package) only
7. Keep backend modular (routes, controllers)
8. Always test code after generating before moving forward
9. When debugging, focus only on the error, do not rewrite unrelated code

---

## 🧩 Build Order (STRICT)

1. Backend server
2. One test API
3. PostgreSQL connection
4. Insert data
5. Fetch data
6. Frontend UI
7. Connect frontend to backend

---

## 🚫 Avoid

- Overengineering
- Adding auth early
- Using new frameworks mid-project
- Long AI prompts

## 🎨 UI Rules (DaisyUI + Tailwind)

- Use DaisyUI with Tailwind (installed via npm, NOT CDN)
- Use components like btn, card, navbar, modal
- Use Tailwind utility classes for layout
- Apply themes using `data-theme`
- Keep UI clean and modern