/* Apoie a Chapa 2 RESET.
   Moldura na foto de perfil, post pronto pra compartilhar e convite pelo WhatsApp.
   Tudo roda no navegador: nenhuma foto sai do aparelho e nao ha chamada de rede
   alem dos arquivos desta propria pasta (apoie.json, img/, molduras/).
   A logica de canvas (arrastar, pinca, zoom), baixar e compartilhar (navigator.share
   com arquivo, caindo pra download) foi adaptada do app "Apoie" da Dra. Damaris. */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };

  /* ---------- configuracao (apoie.json sobrescreve estes padroes) ---------- */
  var CFG = {
    moldura_perfil: 'molduras/perfil-provisoria.png',
    moldura_provisoria: true,
    selo: 'img/cau-reset-badge.webp',
    site: 'resetcau.com',
    titulo_share: 'Eu voto Chapa 2 RESET',
    legenda: 'Dia 5 de novembro eu voto Chapa 2 RESET pra resetar o CAU/SP. Mais trabalho, fiscalização de verdade, suporte ao profissional e transparência. Conheça as 118 propostas em resetcau.com #Chapa2 #RESET #CAUSP',
    whatsapp: 'Dia 5/11 tem eleição do CAU/SP, 100% online. Eu estou com a Chapa 2 RESET. Veja as propostas: https://resetcau.com',
    post: { linha1: 'Eu voto', linha2: 'Chapa 2', linha3: 'RESET', linha4: 'no dia 5 de novembro', rodape: 'resetcau.com' },
    moldura_texto: { linha1: 'VOTE CHAPA 2', linha2: 'RESET' },
    cores: { roxo: '#2a1646', roxo2: '#1d0f33', amarelo: '#f5c400', laranja: '#ff7a2f', azul: '#3fb5ff', verde: '#3ddc84', rosa: '#ff5c9a' }
  };
  var FONTE = 'Montserrat, Arial, Helvetica, sans-serif';
  var LADO = 1080;                 // foto de perfil: 1080 x 1080
  var POST_W = 1080, POST_H = 1350; // post pronto: 1080 x 1350

  /* ---------- utilidades ---------- */
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }
  function carregarImg(src) {
    return new Promise(function (ok, err) {
      var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { err(new Error('nao carregou ' + src)); }; i.src = src;
    });
  }
  function fontesProntas() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var pedidos = ['800 80px Montserrat', '700 60px Montserrat', '600 60px Montserrat'].map(function (f) { return document.fonts.load(f); });
    var limite = new Promise(function (ok) { setTimeout(ok, 2500); });
    return Promise.race([Promise.all(pedidos), limite]).catch(function () { });
  }
  // Reduz o tamanho da fonte ate o texto caber na largura.
  function ajustaFonte(ctx, texto, peso, maximo, larguraMax) {
    var t = maximo;
    while (t > 18) {
      ctx.font = peso + ' ' + t + 'px ' + FONTE;
      if (ctx.measureText(texto).width <= larguraMax) break;
      t -= 2;
    }
    return t;
  }
  function retanguloRedondo(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function bola(ctx, x, y, r, cor) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill(); }
  function desenharSelo(ctx, selo, x, y, tam) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = tam * 0.12; ctx.shadowOffsetY = tam * 0.06;
    if (selo) { ctx.drawImage(selo, x, y, tam, tam); }
    else { // selo nao carregou: circulo amarelo com o numero 2
      bola(ctx, x + tam / 2, y + tam / 2, tam / 2, CFG.cores.amarelo);
      ctx.shadowColor = 'transparent'; ctx.fillStyle = CFG.cores.roxo2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 ' + Math.round(tam * 0.55) + 'px ' + FONTE; ctx.fillText('2', x + tam / 2, y + tam / 2 + tam * 0.03);
    }
    ctx.restore();
  }
  function paraBlob(canvas, tipo, qualidade) { return new Promise(function (ok) { canvas.toBlob(ok, tipo, qualidade); }); }
  function baixar(blob, nome) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  // O aparelho sabe compartilhar arquivo? (folha nativa do celular)
  var PODE_COMPARTILHAR = (function () {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob([new Uint8Array(4)], { type: 'image/png' })], 't.png', { type: 'image/png' })] })); }
    catch (e) { return false; }
  })();
  // Tenta a folha nativa; se nao houver (computador), baixa o arquivo.
  function compartilharOuBaixar(blob, nome, titulo, texto) {
    if (PODE_COMPARTILHAR) {
      var file = new File([blob], nome, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: titulo, text: texto })
          .then(function () { return 'share'; })
          .catch(function (e) { if (e && e.name === 'AbortError') return 'cancel'; baixar(blob, nome); return 'download'; });
      }
    }
    baixar(blob, nome); return Promise.resolve('download');
  }
  function copiarTexto(t) {
    var moderno = (navigator.clipboard && window.isSecureContext) ? navigator.clipboard.writeText(t).then(function () { return true; }).catch(function () { return false; }) : Promise.resolve(false);
    return moderno.then(function (ok) {
      if (ok) return true;
      try {
        var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0'; document.body.appendChild(ta);
        ta.select(); ta.setSelectionRange(0, t.length); var r = document.execCommand('copy'); ta.remove(); return r;
      } catch (e) { return false; }
    });
  }

  /* ---------- moldura provisoria (desenhada no navegador) ----------
     1080x1080, centro transparente, borda fina roxa, faixa inferior roxa com
     "VOTE CHAPA 2 RESET" em amarelo e o selo no canto inferior direito. */
  function gerarMolduraProvisoria(selo) {
    var C = CFG.cores, c = document.createElement('canvas'); c.width = c.height = LADO;
    var x = c.getContext('2d'), borda = 18, faixaY = 860;
    x.fillStyle = C.roxo;
    x.fillRect(0, 0, LADO, borda); x.fillRect(0, 0, borda, LADO); x.fillRect(LADO - borda, 0, borda, LADO);
    x.fillRect(0, faixaY, LADO, LADO - faixaY);
    x.fillStyle = C.amarelo; x.fillRect(0, faixaY - 12, LADO, 12);
    var larg = LADO - 56 - 290; // deixa o canto direito pro selo
    x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = C.amarelo;
    ajustaFonte(x, CFG.moldura_texto.linha1, '800', 86, larg); x.fillText(CFG.moldura_texto.linha1, 56, 928);
    ajustaFonte(x, CFG.moldura_texto.linha2, '800', 86, larg); x.fillText(CFG.moldura_texto.linha2, 56, 1012);
    desenharSelo(x, selo, LADO - 250 - 28, LADO - 250 - 28, 250);
    return c;
  }

  /* ---------- post pronto 1080x1350 (desenhado no navegador) ---------- */
  function gerarPost(selo) {
    var C = CFG.cores, P = CFG.post, c = document.createElement('canvas'); c.width = POST_W; c.height = POST_H;
    var x = c.getContext('2d');
    x.fillStyle = C.roxo; x.fillRect(0, 0, POST_W, POST_H);
    x.save(); x.globalAlpha = 0.9;
    bola(x, 1010, 90, 200, C.laranja);
    bola(x, 70, 1270, 120, C.azul);
    bola(x, 120, 560, 62, C.verde);
    bola(x, 980, 600, 44, C.rosa);
    x.restore();
    desenharSelo(x, selo, (POST_W - 480) / 2, 110, 480);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#ffffff'; ajustaFonte(x, P.linha1, '600', 64, 960); x.fillText(P.linha1, POST_W / 2, 690);
    x.fillStyle = C.amarelo; ajustaFonte(x, P.linha2, '800', 150, 960); x.fillText(P.linha2, POST_W / 2, 805);
    x.fillStyle = C.amarelo; ajustaFonte(x, P.linha3, '800', 118, 960); x.fillText(P.linha3, POST_W / 2, 930);
    x.fillStyle = '#ffffff'; ajustaFonte(x, P.linha4, '700', 58, 960); x.fillText(P.linha4, POST_W / 2, 1045);
    var tam = ajustaFonte(x, P.rodape, '800', 52, 900), lw = x.measureText(P.rodape).width + 90, lh = 92, ly = 1150;
    x.fillStyle = C.amarelo; retanguloRedondo(x, (POST_W - lw) / 2, ly, lw, lh, 46); x.fill();
    x.fillStyle = C.roxo2; x.font = '800 ' + tam + 'px ' + FONTE; x.fillText(P.rodape, POST_W / 2, ly + lh / 2 + 2);
    return c;
  }

  /* ---------- passo 1: editor da foto de perfil ---------- */
  var foto = null, moldura = null, estado = { x: 0, y: 0, zoom: 1 };
  var cvOut = document.createElement('canvas'); cvOut.width = LADO; cvOut.height = LADO;
  var cvPrev = $('#cv-previa'), cvGuia = $('#cv-guia'), palco = $('#palco'), zoomEl = $('#zoom');

  function ajustarPrev() {
    var r = palco.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    [cvPrev, cvGuia].forEach(function (c) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); });
  }
  function retFoto(W, H) {
    var cover = Math.max(W / foto.width, H / foto.height), s = cover * estado.zoom, w = foto.width * s, h = foto.height * s;
    return { x: (W - w) / 2 + estado.x, y: (H - h) / 2 + estado.y, w: w, h: h };
  }
  function desenhar() {
    var W = LADO, H = LADO, ctx = cvOut.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    var gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, CFG.cores.roxo); gr.addColorStop(1, CFG.cores.roxo2);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    if (foto) {
      var r = retFoto(W, H), cobre = r.x <= 0 && r.y <= 0 && r.x + r.w >= W && r.y + r.h >= H;
      if (!cobre) { // foto nao cobre tudo: fundo com a propria foto desfocada
        var cv = Math.max(W / foto.width, H / foto.height) * 1.15, w = foto.width * cv, h = foto.height * cv;
        ctx.save(); ctx.filter = 'blur(38px)'; ctx.drawImage(foto, (W - w) / 2, (H - h) / 2, w, h); ctx.restore();
        ctx.fillStyle = 'rgba(29,15,51,.42)'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 10; ctx.fillStyle = '#000'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore();
      }
      ctx.drawImage(foto, r.x, r.y, r.w, r.h);
    }
    if (moldura) ctx.drawImage(moldura, 0, 0, W, H);
    var p = cvPrev.getContext('2d'); p.clearRect(0, 0, cvPrev.width, cvPrev.height); p.drawImage(cvOut, 0, 0, cvPrev.width, cvPrev.height);
    // guia: o que fica fora do circulo nao aparece na foto de perfil
    var g = cvGuia.getContext('2d'), gw = cvGuia.width, gr2 = gw / 2; g.clearRect(0, 0, gw, gw);
    g.save(); g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.rect(0, 0, gw, gw); g.arc(gr2, gr2, gr2 - 1, 0, Math.PI * 2, true); g.fill('evenodd'); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.arc(gr2, gr2, gr2 - 2, 0, Math.PI * 2); g.stroke();
  }
  function carregarFoto(file) {
    if ('createImageBitmap' in window) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return carregarImg(URL.createObjectURL(file)); });
    }
    return carregarImg(URL.createObjectURL(file));
  }
  function tratarFoto(file) {
    if (!file) return;
    carregarFoto(file).then(function (img) {
      foto = img; estado = { x: 0, y: 0, zoom: 1 }; zoomEl.value = 1;
      palco.classList.add('com-foto'); $('#vazio').hidden = true;
      $('#btn-baixar-perfil').disabled = false; var bc = $('#btn-compartilhar-perfil'); if (bc) bc.disabled = false;
      desenhar(); toast('Foto carregada. Arraste e ajuste o tamanho.');
    }).catch(function (e) { console.error(e); toast('Não consegui abrir essa imagem. Tenta outra.'); });
  }
  $('#btn-escolher').addEventListener('click', function () { $('#arquivo').click(); });
  $('#btn-camera').addEventListener('click', function () { $('#arquivo-camera').click(); });
  $('#btn-trocar').addEventListener('click', function () { $('#arquivo').click(); });
  $('#arquivo').addEventListener('change', function (e) { tratarFoto(e.target.files[0]); e.target.value = ''; });
  $('#arquivo-camera').addEventListener('change', function (e) { tratarFoto(e.target.files[0]); e.target.value = ''; });
  $('#btn-centralizar').addEventListener('click', function () { estado.x = 0; estado.y = 0; desenhar(); });
  zoomEl.addEventListener('input', function (e) { estado.zoom = parseFloat(e.target.value); desenhar(); });

  // arrastar (mouse e toque), pinca (dois dedos) e roda do mouse
  var arr = null, pinca = null;
  var dist = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); };
  function limitaZoom(z) { return Math.min(3, Math.max(0.35, z)); }
  palco.addEventListener('pointerdown', function (e) {
    if (!foto) return; palco.setPointerCapture(e.pointerId);
    arr = { id: e.pointerId, x: e.clientX, y: e.clientY, ex: estado.x, ey: estado.y }; palco.classList.add('arrastando');
  });
  palco.addEventListener('pointermove', function (e) {
    if (!arr || e.pointerId !== arr.id) return;
    var esc = LADO / palco.getBoundingClientRect().width;
    estado.x = arr.ex + (e.clientX - arr.x) * esc; estado.y = arr.ey + (e.clientY - arr.y) * esc; desenhar();
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) { palco.addEventListener(ev, function () { arr = null; palco.classList.remove('arrastando'); }); });
  palco.addEventListener('touchstart', function (e) { if (e.touches.length === 2) { pinca = { d: dist(e.touches), z: estado.zoom }; arr = null; } }, { passive: true });
  palco.addEventListener('touchmove', function (e) { if (pinca && e.touches.length === 2) { estado.zoom = limitaZoom(pinca.z * dist(e.touches) / pinca.d); zoomEl.value = estado.zoom; desenhar(); } }, { passive: true });
  palco.addEventListener('touchend', function () { pinca = null; });
  palco.addEventListener('wheel', function (e) { if (!foto) return; e.preventDefault(); estado.zoom = limitaZoom(estado.zoom * (e.deltaY < 0 ? 1.06 : 0.94)); zoomEl.value = estado.zoom; desenhar(); }, { passive: false });
  window.addEventListener('resize', function () { ajustarPrev(); desenhar(); });

  function blobPerfil() { return paraBlob(cvOut, 'image/jpeg', 0.92); }
  $('#btn-baixar-perfil').addEventListener('click', function () {
    if (!foto) { toast('Escolha uma foto primeiro.'); return; }
    blobPerfil().then(function (b) { baixar(b, 'eu-apoio-chapa2-reset.jpg'); toast('Foto baixada. Agora é só colocar no perfil.'); });
  });
  var btnCompPerfil = $('#btn-compartilhar-perfil');
  if (btnCompPerfil) {
    btnCompPerfil.hidden = !PODE_COMPARTILHAR;
    btnCompPerfil.addEventListener('click', function () {
      if (!foto) { toast('Escolha uma foto primeiro.'); return; }
      blobPerfil().then(function (b) { return compartilharOuBaixar(b, 'eu-apoio-chapa2-reset.jpg', CFG.titulo_share, CFG.legenda); })
        .then(function (r) { if (r === 'share') toast('Pronto. Salve na galeria ou envie como foto.'); else if (r === 'download') toast('Foto baixada.'); });
    });
  }

  /* ---------- passo 2: post pronto ---------- */
  var postBlob = null;
  function blobPost() { return postBlob ? Promise.resolve(postBlob) : Promise.reject(new Error('post ainda nao gerado')); }
  $('#btn-compartilhar-post').addEventListener('click', function () {
    blobPost().then(function (b) { return compartilharOuBaixar(b, 'eu-voto-chapa2-reset.jpg', CFG.titulo_share, CFG.legenda); })
      .then(function (r) {
        if (r === 'share') toast('Pronto. Cole a legenda na hora de publicar.');
        else if (r === 'download') toast('Post baixado. Copie a legenda e publique.');
      }).catch(function () { toast('O post ainda está sendo preparado. Tente de novo.'); });
  });
  $('#btn-baixar-post').addEventListener('click', function () {
    blobPost().then(function (b) { baixar(b, 'eu-voto-chapa2-reset.jpg'); toast('Post baixado. Copie a legenda e publique.'); })
      .catch(function () { toast('O post ainda está sendo preparado. Tente de novo.'); });
  });
  $('#btn-copiar-legenda').addEventListener('click', function () {
    var ta = $('#legenda');
    copiarTexto(ta.value).then(function (ok) {
      if (ok) { toast('Legenda copiada. Agora é só colar no post.'); return; }
      toast('Não consegui copiar sozinho. Segure o texto pra copiar.'); try { ta.focus(); ta.select(); } catch (e) { }
    });
  });

  /* ---------- passo 3: WhatsApp ---------- */
  function montarWhats() {
    var a = $('#btn-whats'); if (!a) return;
    a.href = 'https://wa.me/?text=' + encodeURIComponent(CFG.whatsapp);
    var p = $('#whats-previa'); if (p) p.textContent = CFG.whatsapp;
  }

  /* ---------- inicio ---------- */
  function mesclar(j) {
    if (!j || typeof j !== 'object') return;
    Object.keys(j).forEach(function (k) {
      if (k.charAt(0) === '_') return;
      if (j[k] && typeof j[k] === 'object' && CFG[k] && typeof CFG[k] === 'object') Object.keys(j[k]).forEach(function (s) { CFG[k][s] = j[k][s]; });
      else CFG[k] = j[k];
    });
  }
  function iniciar() {
    ajustarPrev(); desenhar(); montarWhats();
    $('#legenda').value = CFG.legenda;
    fontesProntas().then(function () {
      return carregarImg(CFG.selo).catch(function () { return null; });
    }).then(function (selo) {
      // moldura: tenta o PNG apontado no apoie.json; se nao existir, desenha a provisoria aqui mesmo
      var tenta = CFG.moldura_perfil ? carregarImg(CFG.moldura_perfil) : Promise.reject(new Error('sem moldura'));
      return tenta.then(function (img) { return { selo: selo, moldura: img, provisoria: !!CFG.moldura_provisoria }; })
        .catch(function () { return { selo: selo, moldura: gerarMolduraProvisoria(selo), provisoria: true }; });
    }).then(function (r) {
      moldura = r.moldura;
      var nota = $('#nota-moldura'); if (nota) nota.hidden = !r.provisoria;
      ajustarPrev(); desenhar();
      var post = gerarPost(r.selo);
      return paraBlob(post, 'image/jpeg', 0.92).then(function (b) {
        postBlob = b; var img = $('#post-previa'); img.src = URL.createObjectURL(b); img.hidden = false;
        $('#post-carregando').hidden = true; $('#btn-compartilhar-post').disabled = false; $('#btn-baixar-post').disabled = false;
        // Ajuda pra quem mantem o site: no console, ApoieReset.baixarMolduraProvisoria() salva o PNG da moldura
        // (pra guardar em molduras/) e ApoieReset.baixarPost() salva o post.
        window.ApoieReset = {
          baixarMolduraProvisoria: function () { paraBlob(moldura instanceof HTMLCanvasElement ? moldura : cvOut, 'image/png').then(function (bl) { baixar(bl, 'perfil-provisoria.png'); }); },
          baixarPost: function () { baixar(b, 'post-chapa2-reset.jpg'); }
        };
      });
    }).catch(function (e) { console.error(e); toast('Algo falhou ao preparar as artes. Recarregue a página.'); });
  }

  fetch('apoie.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { mesclar(j); })
    .catch(function () { })
    .then(iniciar);
})();
