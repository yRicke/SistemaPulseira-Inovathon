from django.urls import path

from . import views

app_name = "monitoramento"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("solucao/", views.solucao, name="solucao"),
    path("controle/", views.controle_apresentacao, name="controle"),
    path("api/modo/", views.presentation_mode_state, name="api_modo_state"),
    path("api/modo/definir/", views.presentation_mode_set, name="api_modo_set"),
]
