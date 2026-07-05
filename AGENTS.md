# Agent Instructions

## General
- Keep your responses concise and to the point. Avoid unnecessarily long explanations to optimize token usage.

## Planning Mode (Plan Mode)
- You must ask clarifying questions. Never assume design preferences, tech stack, or features.
- Use sub-agents or background agents to assist with research tasks if available.
- Use background agents to thoroughly review the different aspects of the plan before presenting it to the user.

## Change / Edit Mode
- Never implement features directly from the main context. Always delegate coding tasks to sub-agents to protect the main agent's context window.
- Identify any changes from the plan that cannot be implemented in parallel when using sub-agents.
- Act strictly as a task coordinator.
- Select the best model for the task: use premium models for complex tasks and mid-tier models for simpler tasks (such as documentation).

## Code Quality
- After completing any feature, always run validation commands like lint, type check, and `next build` to check and guarantee code quality before marking the task as complete.

## UI Design
- You must always follow the project's UI design system when creating or reviewing components or pages (coordinating with the `design.md` file).