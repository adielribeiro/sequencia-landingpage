KIT DE LOGS — ENGINE PRO+

Este pacote inclui:
- tools/validate_log.py

Como usar:
1) Gere seu log em JSON (array de eventos).
2) Rode:
   python tools/validate_log.py caminho/do/log.json

Ele valida:
- ordem de turno
- múltiplas ações no mesmo turno
- pendingTableClear inconsistente