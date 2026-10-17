/* Chapa 2 RESET · ligação do site com o banco (Supabase)
   A chave abaixo é a PUBLICÁVEL: pode ficar no site. Quem protege os dados é a regra de linha (RLS) no banco:
   visitante só insere; ler, editar e apagar exige login no painel. */
(function () {
  var URL = "https://ficbsdhrmatymmbemzzq.supabase.co";
  var CHAVE = "sb_publishable_B2Qru66yVU0sBFOaKZPmMw_-vOFLp_T";
  function cliente() {
    if (!window.supabase || !window.supabase.createClient) throw new Error("biblioteca do banco não carregou");
    if (!window.__resetDb) window.__resetDb = window.supabase.createClient(URL, CHAVE);
    return window.__resetDb;
  }
  /* cliente só pra formulários públicos: sempre como visitante, mesmo se a pessoa estiver logada no painel */
  function publico() {
    if (!window.supabase || !window.supabase.createClient) throw new Error("biblioteca do banco não carregou");
    if (!window.__resetDbPub) window.__resetDbPub = window.supabase.createClient(URL, CHAVE, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "reset-publico" } });
    return window.__resetDbPub;
  }
  function limpa(s, max) { s = (s == null ? "" : String(s)).trim(); return s.length > max ? s.slice(0, max) : s; }
  function origem() { try { return limpa(location.pathname + (document.referrer ? " <- " + new URL(document.referrer).hostname : ""), 120); } catch (e) { return ""; } }

  window.ResetDb = {
    cliente: cliente,
    enviarApoio: async function (d) {
      var linha = {
        nome: limpa(d.nome, 120), email: limpa(d.email, 160).toLowerCase(), whatsapp: limpa(d.whatsapp, 30) || null,
        cidade: limpa(d.cidade, 80), atuacao: limpa(d.atuacao, 60) || null, registro_cau: limpa(d.registro_cau, 40) || null,
        autoriza: !!d.autoriza, voluntario: !!d.voluntario, origem: origem()
      };
      var r = await publico().from("apoiadores").insert(linha);
      if (r.error) {
        if (r.error.code === "23505") return { ok: true, repetido: true }; // e-mail já cadastrado: trata como sucesso
        throw r.error;
      }
      return { ok: true };
    },
    enviarIdeia: async function (d) {
      var linha = {
        tema: limpa(d.tema, 80), cidade: limpa(d.cidade, 80) || null, texto: limpa(d.texto, 4000),
        nome: limpa(d.nome, 120) || null, email: limpa(d.email, 160).toLowerCase() || null, telefone: limpa(d.telefone, 30) || null,
        autoriza: !!d.autoriza, origem: origem()
      };
      var r = await publico().from("ideias").insert(linha);
      if (r.error) throw r.error;
      return { ok: true };
    },
    contadores: async function () {
      var r = await publico().rpc("contadores_publicos");
      if (r.error) throw r.error;
      return r.data;
    }
  };
})();
