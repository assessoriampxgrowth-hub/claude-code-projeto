# SFX — Efeitos Sonoros MPX

Coloque aqui os arquivos de efeito sonoro (.mp3 ou .wav) usados pelo preset
MPX_REELS_PREMIUM. O pipeline detecta automaticamente os arquivos com estes nomes:

| Arquivo            | Uso                              | Volume alvo  |
|--------------------|----------------------------------|--------------|
| `caption.mp3`      | Entrada de legenda (click/tap)   | -22 a -16 dB |
| `cut.mp3`          | Corte de cena importante (snap)  | -22 a -16 dB |
| `transition.mp3`   | Transição mais forte (whoosh)    | -22 a -16 dB |
| `impact.mp3`       | Pico de atenção (hit leve)       | -22 a -16 dB |

Regras:
- Sons curtos (100-400ms), discretos.
- A voz sempre domina — SFX nunca compete com a fala.
- Sem arquivos aqui, o pipeline simplesmente NÃO aplica SFX (sem erro).

Fontes gratuitas recomendadas: Pixabay Audio, Mixkit, Uppbeat (royalty-free).
