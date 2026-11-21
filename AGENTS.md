# Agent instructions

Start with the requested outcome and what would show it has been achieved.
Use the guidance relevant to the task:

- **Implement a change:** Consult the owning app or package's `docs/specs/SPEC.md`
  and relevant capabilities. For shared behavior, also consult the
  [root spec index](docs/specs/SPEC.md). Follow the applicable
  [engineering conventions](docs/engineering.md) and use the
  [workspace commands](README.md#workspace-commands).
- **Discuss or change a spec:** Read the relevant spec and the
  [specification rules](docs/engineering.md#specifications). Only the developer
  can accept requirements. Do not treat proposed or deferred capabilities as
  accepted requirements, or treat an implementation request alone as acceptance.
- **Create or continue a plan:** Read the [plan guide](plans/README.md) and
  inspect relevant root and app-local active plans. Before reporting planned
  work complete or preparing its final PR, follow the
  [plan closure rule](plans/README.md#maintain-and-close-the-plan).
- **Review or advise:** Inspect the requested scope and applicable contracts;
  report findings or options as requested. See the [skills catalog](docs/skills.md)
  for focused workflows.

For substantial work or work that may overlap an active plan, inspect relevant
root and app-local active plans. Read [architecture](docs/architecture.md) when
work touches module boundaries, dependencies, or repository layout. Preserve
the renderer-independent `DrawingContext` boundary when changing drawing code.
Use the [verification evidence rule](docs/engineering.md#verification-evidence)
when claiming a change or checkpoint has been verified.

Before adding persistent guidance, check whether an existing authoritative
document can be clarified or consolidated. Add a rule only when it captures a
repository-specific decision that existing guidance and checks do not cover.
