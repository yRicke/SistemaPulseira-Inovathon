from threading import Lock

from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

ALLOWED_MODES = {"normal", "calor", "fadiga", "recuperacao"}
PRESENTATION_STATE = {"mode": "normal", "updated_at": timezone.now().isoformat()}
STATE_LOCK = Lock()


def dashboard(request):
    context = {
        "nome_solucao": "AgroCare Pulse",
        "subtitulo": "Monitoramento preventivo da saude ocupacional no campo",
        "trabalhador": {
            "nome": "Marcos Silva",
            "funcao": "Operador de colheita",
            "fazenda": "Fazenda Santa Aurora",
            "turno": "Manha",
        },
    }
    return render(request, "monitoramento/dashboard.html", context)


def solucao(request):
    return render(request, "monitoramento/solucao.html")


@ensure_csrf_cookie
def controle_apresentacao(request):
    return render(
        request,
        "monitoramento/controle_apresentacao.html",
        {"modo_atual": PRESENTATION_STATE["mode"]},
    )


@require_http_methods(["GET"])
def presentation_mode_state(request):
    return JsonResponse(
        {
            "mode": PRESENTATION_STATE["mode"],
            "updated_at": PRESENTATION_STATE["updated_at"],
        }
    )


@require_http_methods(["POST"])
def presentation_mode_set(request):
    mode = request.POST.get("mode", "").strip().lower()
    if mode not in ALLOWED_MODES:
        return JsonResponse(
            {"ok": False, "error": "Modo invalido.", "allowed_modes": sorted(ALLOWED_MODES)},
            status=400,
        )

    with STATE_LOCK:
        PRESENTATION_STATE["mode"] = mode
        PRESENTATION_STATE["updated_at"] = timezone.now().isoformat()

    return JsonResponse(
        {
            "ok": True,
            "mode": PRESENTATION_STATE["mode"],
            "updated_at": PRESENTATION_STATE["updated_at"],
        }
    )
