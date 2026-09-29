"""Salva a sessão do instaloader a partir dos cookies de um navegador já logado.

Use quando `instaloader --login` cair na verificação de segurança (checkpoint)
do Instagram. Como o navegador já é um "dispositivo confiável", reaproveitar a
sessão dele costuma funcionar.

1. Entre na conta secundária em instagram.com pelo navegador.
2. F12 > Aplicativo (Chrome/Edge) ou Armazenamento (Firefox) > Cookies > https://www.instagram.com
3. Rode `uv run import_session.py` e cole os valores de `sessionid` e `csrftoken`
   quando pedir (eles não aparecem na tela nem ficam no histórico).
"""

import getpass
from urllib.parse import unquote

import instaloader


def main() -> None:
    sessionid = getpass.getpass("Valor do cookie sessionid: ").strip()
    csrftoken = getpass.getpass("Valor do cookie csrftoken: ").strip()
    if not sessionid or not csrftoken:
        raise SystemExit("Os dois valores são necessários.")

    cookies = {
        "sessionid": sessionid,
        "csrftoken": csrftoken,
        # O sessionid começa com o id numérico da conta ("123456%3A...").
        "ds_user_id": unquote(sessionid).split(":", 1)[0],
    }
    loader = instaloader.Instaloader(quiet=True)
    loader.load_session("", cookies)
    username = loader.test_login()
    if not username:
        raise SystemExit("Não funcionou: confira se copiou os cookies da conta secundária, logada.")

    loader.context.username = username
    loader.save_session_to_file()
    print(f"Sessão salva para @{username}. Agora é só me avisar o nome de usuário.")


if __name__ == "__main__":
    main()
