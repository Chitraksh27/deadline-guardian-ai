# 08-implementation-plan.md — Deadline Guardian AI Implementation Plan

This document outlines the phased roadmap for the Deadline Guardian AI platform.

## Phase A: Core Intake & Plan Orchestration (COMPLETED)
- **Multi-Agent Flow**:
  - **Goal Intake Agent**: Analyzes raw natural language objectives to produce title, description, deadline, and complexity metrics.
  - **Planning Agent**: Decomposes goals into logical tasks with dependency mapping (DAG).
  - **Scheduling Agent**: Allocates sequential, non-overlapping work slots (max 3 hours/day) for pending tasks using topological sort (Kahn's Algorithm).
  - **Risk Engine**: Determines deadline failure risks (0-100 score) based on velocity ratios and missed milestones.
  - **Recovery Agent**: Synthesizes actionable recovery recommendations using Google Gemini when milestones are missed.
- **Full-Stack Foundation**:
  - Vite + React SPA Client.
  - Express.js API Server (`server.ts`).
  - Drizzle ORM PostgreSQL integration.
  - Firebase Authentication + Session-secure custom Auth middleware.
  - Diagnostic Payload Inspector & Log Audit view.

## Phase B: Dynamic Rescheduling, Progress Tracking, & UX Hardening (IN PROGRESS)
- **Advanced Scheduling & Incremental Rescheduling**:
  - Hardening the `Scheduling Agent` to skip already `COMPLETED` tasks.
  - Preservation of historic completed schedule blocks while shifting future pending tasks safely when rescheduling is triggered.
- **Visual Analytics & UI/UX Elevation**:
  - Interactive Visual progress indicators showing Completed, Missed, and Pending metrics for each goal.
  - Visual timeline/Gantt-style representation for the Chronological Focus Schedule.
  - Full search and status-based filtering on the Diagnostic Multi-Agent Audit Log explorer.
- **Enhanced Task Metadata**:
  - Visual indicator of dependency requirements on the task list.

## Phase C: Collaborative Workspaces & Advanced Integrations (FUTURE SCOPE)
- Multi-user workspace collaboration.
- External Google Calendar, Slack, and Jira integrations.
- Auto-alert triggers.
