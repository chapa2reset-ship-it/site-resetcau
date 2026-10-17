/* Chapa 2 RESET · faixa amarela do topo com a contagem de dias até a votação (5/11/2026) */
(function () {
  var f = document.querySelector(".faixa-voto"); if (!f) return;
  function atualiza() {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var d = Math.round((new Date(2026, 10, 5) - hoje) / 86400000), q;
    if (d > 1) q = "Faltam <b>" + d + "</b> dias"; else if (d === 1) q = "Falta <b>1</b> dia"; else if (d === 0) q = "<b>É hoje!</b>"; else q = "Votação encerrada";
    var longo = d >= 0 ? " · Votação dia 5 de novembro, quinta-feira, 100% online. Vote Chapa 2." : "";
    var curto = d >= 0 ? " · 5/11, 100% online. Vote Chapa 2." : "";
    f.innerHTML = '<span class="fv-longo">' + q + longo + '</span><span class="fv-curto">' + q + curto + "</span>";
  }
  atualiza(); setInterval(atualiza, 60 * 60 * 1000);
})();
