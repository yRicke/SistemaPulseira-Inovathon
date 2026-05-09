from django.test import TestCase
from django.urls import reverse

from .views import PRESENTATION_STATE


class MonitoramentoViewsTests(TestCase):
    def setUp(self):
        PRESENTATION_STATE["mode"] = "normal"

    def test_dashboard_response(self):
        response = self.client.get(reverse("monitoramento:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "AgroCare Pulse")

    def test_solucao_response(self):
        response = self.client.get(reverse("monitoramento:solucao"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Problema")

    def test_controle_response(self):
        response = self.client.get(reverse("monitoramento:controle"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Modo de Apresentacao no Celular")

    def test_api_mode_state_response(self):
        response = self.client.get(reverse("monitoramento:api_modo_state"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mode"], "normal")

    def test_api_mode_set_response(self):
        response = self.client.post(reverse("monitoramento:api_modo_set"), {"mode": "fadiga"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mode"], "fadiga")

    def test_api_mode_set_invalid(self):
        response = self.client.post(reverse("monitoramento:api_modo_set"), {"mode": "invalido"})
        self.assertEqual(response.status_code, 400)
