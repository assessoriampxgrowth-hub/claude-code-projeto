/**
 * Converte HTML animado → MP4
 * Intercepta requestAnimationFrame ANTES da página carregar para controlar
 * o tempo frame a frame com precisão — sem depender do clock real.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const HTML_FILE = 'C:\\Users\\Matheus\\Desktop\\MEMÓRIA CLAUDE CODE\\CLIENTES\\02_ALIMENTACAO\\Restaurante Centro Oeste\\05_Materiais_do_Cliente\\VÍDEOS\\VÍDEO OFICIAL COM ENDEREÇO DO RESTAURANTE CENTRO OESTE.html';
const FRAMES_DIR = path.resolve(__dirname, 'frames_tmp');
const OUTPUT_FILE = 'C:\\Users\\Matheus\\Desktop\\MEMÓRIA CLAUDE CODE\\CLIENTES\\02_ALIMENTACAO\\Restaurante Centro Oeste\\05_Materiais_do_Cliente\\VÍDEOS\\VÍDEO OFICIAL COM ENDEREÇO DO RESTAURANTE CENTRO OESTE.mp4';

const FPS          = 30;
const DURATION_SEC = 25;
const TOTAL_FRAMES = FPS * DURATION_SEC;   // 750
const MS_PER_FRAME = 1000 / FPS;           // 33.333ms

async function main() {
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR);

  console.log('Iniciando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // ─── Injeta ANTES de carregar a página ──────────────────────────────────
  await page.evaluateOnNewDocument(() => {
    window.__vt = 0;          // virtual time em ms
    window.__rafQueue = [];   // fila de callbacks RAF pendentes

    // Substitui requestAnimationFrame por versão manual
    window.requestAnimationFrame = (cb) => {
      const id = window.__rafQueue.push(cb);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      window.__rafQueue[id - 1] = null;
    };

    // Substitui relógios JS (performance.now e Date.now)
    // — afeta animações JS/React mas NÃO CSS (CSS usa o compositor)
    performance.now = () => window.__vt;
    Date.now = () => Math.round(window.__vt);

    // Função chamada pelo Puppeteer para avançar um frame
    window.__advanceFrame = function(ms) {
      window.__vt += ms;
      const cbs = window.__rafQueue.splice(0);
      for (const cb of cbs) {
        if (typeof cb === 'function') {
          try { cb(window.__vt); } catch (_) {}
        }
      }
    };
  });
  // ────────────────────────────────────────────────────────────────────────

  const fileUrl = `file:///${HTML_FILE.replace(/\\/g, '/')}`;
  console.log(`Carregando: ${fileUrl}`);

  // Navega — networkidle0 pode travar se RAF está parado; usa load
  await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });

  // Aquece a página: avança vários frames de inicialização para React montar
  console.log('Inicializando animação (warm-up)...');
  for (let w = 0; w < 60; w++) {
    await page.evaluate(() => window.__advanceFrame(16.67));
    await new Promise(r => setTimeout(r, 10));
  }

  // Remove a barra de controles do Stage e quaisquer overlays de UI
  await page.evaluate(() => {
    // 1. Esconde loading e thumbnail do bundler
    ['__bundler_loading', '__bundler_thumbnail'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.setProperty('display', 'none', 'important');
    });

    // 2. Esconde a barra de controles do Stage:
    //    Ela fica abaixo do canvas (y > 1000), tem fundo escuro e contém os botões de play/pause.
    //    Identificação: elemento com background rgba(20,20,20,...) que contém texto de tempo "0:xx"
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      // Elementos abaixo de y=1000 com altura < 100px = barra de controles
      if (r.y >= 1000 && r.height < 100 && r.height > 0) {
        el.style.setProperty('display', 'none', 'important');
        return;
      }
      // Qualquer elemento com position:fixed fora do root de vídeo
      const cs = window.getComputedStyle(el);
      if (cs.position === 'fixed' && !el.closest('[data-video-root]')) {
        el.style.setProperty('display', 'none', 'important');
      }
    });

    // 3. Força o container do Stage a não transbordar — garante que só o canvas aparece
    const videoRoot = document.querySelector('[data-video-root]');
    if (videoRoot) {
      // Sobe na árvore e garante overflow:hidden em todos os wrappers
      let el = videoRoot.parentElement;
      while (el && el !== document.body) {
        el.style.overflow = 'hidden';
        el = el.parentElement;
      }
    }
  });

  // Garante que o vídeo está no frame 0 (reinicia o tempo virtual)
  await page.evaluate(() => { window.__vt = 0; });

  console.log(`Capturando ${TOTAL_FRAMES} frames a ${FPS}fps (${DURATION_SEC}s)...`);

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    // Avança exatamente 1 frame no tempo virtual
    await page.evaluate((ms) => window.__advanceFrame(ms), MS_PER_FRAME);

    // Aguarda o browser renderizar (um tick real mínimo)
    await new Promise(r => setTimeout(r, 5));

    const framePath = path.join(FRAMES_DIR, `frame_${String(i).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });

    if (i % 30 === 0) process.stdout.write(`  Frame ${i + 1}/${TOTAL_FRAMES}\r`);
  }

  console.log('\nFrames capturados. Fechando browser...');
  await browser.close();

  // Localiza FFmpeg
  let ffmpegBin = 'ffmpeg';
  try { ffmpegBin = require('ffmpeg-static'); } catch {}

  const inputPattern = path.join(FRAMES_DIR, 'frame_%05d.png');
  console.log(`Gerando MP4: ${OUTPUT_FILE}`);

  const result = spawnSync(ffmpegBin, [
    '-y',
    '-framerate', String(FPS),
    '-i', inputPattern,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=1920:1080',
    OUTPUT_FILE,
  ], { stdio: 'inherit' });

  if (result.error) { console.error('Erro ffmpeg:', result.error.message); process.exit(1); }

  fs.rmSync(FRAMES_DIR, { recursive: true });
  console.log(`\nPronto! Vídeo salvo em:\n${OUTPUT_FILE}`);
}

main().catch(err => { console.error(err); process.exit(1); });
