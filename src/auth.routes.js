const express = require("express");
const router = express.Router();
// Corrigido: Caminhos de importação ajustados para a estrutura atual dentro de src/
const { register, login, getMe, createAdminUser } = require("./auth.controller");
const { protect, authorize } = require('../middlewares/auth.middleware');

// Rotas públicas
router.post("/register", register);
router.post("/login", login);

// Rotas protegidas
router.get("/me", protect, getMe);

// Rota protegida e autorizada apenas para admin
// A criação de admin pode ser uma rota especial ou um script separado, dependendo da necessidade.
// Se for uma rota, garantir que esteja bem protegida.
router.post("/admin/create", protect, authorize("admin"), createAdminUser);

module.exports = router;
