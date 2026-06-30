# 🛡️ Deadline Guardian AI

<div align="center">

### **Autonomous AI Project Execution Platform**

*"Because missing a deadline is a failure of orchestration, not of intent."*

Transform ambitious goals into executable plans through an intelligent multi-agent system that plans, schedules, monitors, predicts, and recovers project execution before deadlines are missed.

---

**Built with Google Gemini • React • TypeScript • PostgreSQL • Drizzle ORM**

</div>

---

# 📖 Overview

Traditional productivity applications notify users **when** deadlines are approaching.

**Deadline Guardian AI** ensures users know **how to meet them.**

Instead of acting as a passive reminder application, Deadline Guardian continuously orchestrates project execution using a specialized multi-agent architecture.

From a single natural-language objective, the platform can:

* Understand project intent
* Generate structured execution plans
* Build dependency-aware schedules
* Continuously monitor execution
* Predict deadline failure
* Automatically generate recovery strategies
* Coordinate collaborative workspaces

The result is an AI-powered execution system rather than another task manager.

---

# 🚀 Why Deadline Guardian?

## The Problem

Modern productivity tools are excellent at storing tasks.

They are poor at ensuring those tasks actually get completed.

Users frequently:

* Miss assignment deadlines
* Underestimate project complexity
* Overcommit schedules
* Ignore reminders
* Lose track of dependencies
* Fail to recover after falling behind

Reminders don't solve execution.

Execution requires planning, prioritization, monitoring, and adaptation.

---

## Our Solution

Deadline Guardian AI behaves like an intelligent Chief-of-Staff.

Rather than asking:

> "What should I do today?"

It continuously answers:

* What is the highest priority?
* What should happen next?
* Am I falling behind?
* Why is this project at risk?
* What is the fastest recovery path?

---

# ✨ Core Features

| Feature                           | Description                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| 🧠 Intelligent Goal Understanding | Converts natural-language goals into structured project definitions using Google Gemini  |
| 📋 AI Planning Engine             | Breaks complex objectives into dependency-aware executable tasks                         |
| 📅 Smart Scheduling               | Generates optimized work schedules using topological sorting and dependency analysis     |
| 📈 Deadline Risk Analysis         | Continuously predicts project risk using workload, velocity, and remaining time          |
| 🔄 Recovery Planning              | Automatically rebuilds schedules after delays with AI-generated recovery strategies      |
| 👥 Collaborative Workspaces       | Team-based workspaces with role-based access control and shared project management       |
| 🔔 Intelligent Notifications      | Context-aware alerts, reminders, and recovery recommendations                            |
| 📊 Executive Dashboard            | Live project insights, Guardian Briefings, productivity metrics, and execution summaries |
| 🔍 Explainable AI                 | Every recommendation includes reasoning and expected impact                              |
| 🔒 Enterprise Security            | Workspace isolation, RBAC, validation, and secure APIs                                   |

---

# 🤖 Multi-Agent Architecture

Deadline Guardian is built around specialized AI services rather than a single monolithic assistant.

```
                    User Goal
                        │
                        ▼
             Goal Understanding Service
                        │
                        ▼
               Planning Service
                        │
                        ▼
             Scheduling Service
                        │
                        ▼
               Risk Analysis
                        │
                        ▼
              Recovery Recommendation
                        │
                        ▼
                  Guardian Dashboard
```

An **Agent Orchestrator** coordinates each service while PostgreSQL persists every project state, schedule, and recommendation.

This architecture enables:

* Modular AI reasoning
* Explainable decisions
* Independent agent evolution
* Fault isolation
* Scalable orchestration

---

# 🏗 System Architecture

```
                 Frontend (React + Vite)
                         │
                         ▼
                Express API Layer
                         │
                         ▼
                Agent Orchestrator
                         │
 ┌────────────┬────────────┬────────────┬────────────┐
 ▼            ▼            ▼            ▼            ▼
Goal      Planning    Scheduling     Risk      Recovery
Service    Service      Service      Engine     Service
 └────────────┴────────────┴────────────┴────────────┘
                         │
                         ▼
               PostgreSQL + Drizzle ORM
```

---

# 🗄 Database Model

```
Workspace
    │
    ▼
Goals
    │
    ▼
Tasks
    │
    ▼
Schedule Blocks

Risk Assessments

Activity Logs

Workspace Members

Notifications

Integrations
```

The database is fully relational and supports:

* Foreign Keys
* Cascading Deletes
* Workspace Isolation
* Role-Based Access Control
* Activity History
* AI Execution Tracking

---

# ⚙️ Technology Stack

| Layer          | Technology                        |
| -------------- | --------------------------------- |
| Frontend       | React 18 + Vite                   |
| Backend        | Express.js + TypeScript           |
| Styling        | Tailwind CSS                      |
| Animations     | Framer Motion                     |
| Icons          | Lucide React                      |
| Database       | PostgreSQL                        |
| ORM            | Drizzle ORM                       |
| AI Platform    | Google Gemini 2.5 Flash           |
| AI SDK         | @google/genai                     |
| Validation     | Zod                               |
| Authentication | Firebase Authentication           |
| Scheduling     | Kahn's Topological Sort Algorithm |
| Deployment     | Google AI Studio                  |

---

# 🧠 AI Decision Pipeline

Every project follows the same autonomous execution pipeline.

```
Goal

↓

Understand Intent

↓

Decompose Work

↓

Generate Dependencies

↓

Build Schedule

↓

Monitor Progress

↓

Predict Risk

↓

Generate Recovery

↓

Repeat
```

Unlike conventional planners, Deadline Guardian continuously re-evaluates project health as execution progresses.

---

# 🔒 Security

Deadline Guardian includes multiple production-grade safeguards.

* Workspace isolation
* Role-Based Access Control (RBAC)
* Request validation with Zod
* Protected API routes
* Ownership verification
* Invitation validation
* Secure environment configuration
* Structured error handling

---

# ⚡ Performance

Designed for responsive project execution.

Highlights include:

* Optimized PostgreSQL indexing
* Dependency-aware scheduling
* Incremental schedule regeneration
* Efficient dashboard aggregation
* Lazy-loaded interface components
* Optimized React rendering
* Typed API contracts

---

# 🧪 Testing

The project follows an SSDLC-inspired validation process.

## Unit Testing

* Business logic
* Agent services
* Scheduling engine
* Risk engine
* Validation

## Integration Testing

* API ↔ Database
* AI ↔ Parsing
* Workspace ↔ Authorization
* Scheduling ↔ Risk

## End-to-End Testing

Primary user journeys:

* Authentication
* Goal creation
* Planning
* Scheduling
* Task completion
* Risk recalculation
* Recovery generation
* Workspace collaboration

---

# 📂 Repository Structure

```
src/

├── agents/
├── components/
├── routes/
├── services/
├── repositories/
├── validators/
├── lib/
├── hooks/
├── types/
└── utils/
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone <repository-url>

cd deadline-guardian
```

---

## Install Dependencies

```bash
npm install
```

---

## Configure Environment

Create a `.env` file.

```env
GEMINI_API_KEY=

DATABASE_URL=

FIREBASE_API_KEY=

FIREBASE_AUTH_DOMAIN=

FIREBASE_PROJECT_ID=
```

---

## Sync Database

```bash
npm run db:push
```

---

## Start Development

```bash
npm run dev
```

The application will be available at:

```
http://localhost:3000
```

---

# 📊 Roadmap

## Version 1.0

* ✅ Intelligent Planning
* ✅ Dynamic Scheduling
* ✅ Deadline Risk Prediction
* ✅ Recovery Recommendations
* ✅ Collaborative Workspaces

---

## Version 2.0

* Google Calendar Sync
* Slack Workspace Automation
* Microsoft Teams Integration
* GitHub Integration
* Background AI Jobs

---

## Version 3.0

* Personal Productivity Memory
* Adaptive Scheduling
* AI Performance Analytics
* Executive Reports

---

# 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

Please open an Issue or Pull Request before making major architectural changes.

---

# 📄 License

This project is released under the MIT License.

---

# 🙏 Acknowledgements

Built using:

* Google Gemini
* Google AI Studio
* React
* Express.js
* PostgreSQL
* Drizzle ORM
* Tailwind CSS
* Framer Motion
* Lucide Icons

---

<div align="center">

### Deadline Guardian AI

**Plan Smarter • Execute Better • Never Miss a Deadline**

</div>
