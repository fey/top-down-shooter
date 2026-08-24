# Triage Labels

Пять канонических triage-ролей используются как строки лейблов дословно: `needs-triage`,
`needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Когда скилл называет роль
(«apply the AFK-ready triage label»), это `ready-for-agent`.

В `bd` лейблы применяются `bd update <id> --add-label <label>`, снимаются `--remove-label`,
фильтруются `bd list --label` / `--label-any` / `--exclude-label`. Заводить лейбл заранее не нужно —
`bd` принимает любую строку.
