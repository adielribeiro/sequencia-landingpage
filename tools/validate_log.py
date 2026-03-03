# validate_log.py
# Validador simples de inconsistência de turnos/jogadas
# Uso:
#   python validate_log.py caminho/do/log.json

import json
import sys

def load(path):
    with open(path,"r",encoding="utf-8") as f:
        return json.load(f)

def validate(events):
    errors=[]
    last_current=None
    seen_action_in_turn={}
    last_round=None

    for i,ev in enumerate(events):
        t=ev.get("type")
        pid=ev.get("playerId")
        current=ev.get("currentPlayerId") or ev.get("currentPlayer")
        round_count=ev.get("roundCount")

        if last_round is not None and round_count is not None and round_count < last_round:
            errors.append((i,"Round voltou no tempo",ev))
        if round_count is not None:
            last_round=round_count

        # mudou turno
        if current is not None and current!=last_current:
            seen_action_in_turn={}
            last_current=current

        if t in ("PLAY","DRAW"):
            if current and pid and pid!=current:
                errors.append((i,f"Ação fora do turno ({pid} != {current})",ev))

            if pid:
                if seen_action_in_turn.get(pid):
                    errors.append((i,f"Mais de uma ação no turno ({pid})",ev))
                else:
                    seen_action_in_turn[pid]=True

        if ev.get("pendingTableClear") is True:
            table=ev.get("tableIds") or ev.get("table")
            if isinstance(table,list) and len(table)==0 and t!="CLEAR_TABLE":
                errors.append((i,"Mesa limpa antes do clearTable",ev))

    return errors

def main():
    if len(sys.argv)<2:
        print("Uso: python validate_log.py log.json")
        return
    events=load(sys.argv[1])
    errs=validate(events)
    if not errs:
        print("OK: nenhuma inconsistência detectada")
        return
    print(f"{len(errs)} inconsistências encontradas:")
    for i,msg,ev in errs[:50]:
        print(f"Linha {i}: {msg} | type={ev.get('type')} player={ev.get('playerId')}")

if __name__=="__main__":
    main()