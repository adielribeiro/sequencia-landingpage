import React, { useMemo, useRef, useState } from 'react';
import { SERVER_URL } from './services/runtimeConfig';
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EmailIcon from '@mui/icons-material/Email';

import boardBg from './assets/board_coliseu.png';
import logo from './assets/ArchangelSoft.png';

import imagem01 from './assets/landing/imagem01.jpg';
import imagem02 from './assets/landing/imagem02.jpg';

import cartaVerso from './assets/landing/carta-verso.jpg';
import cartaEspada from './assets/landing/carta-espada.jpg';
import cartaEscudo from './assets/landing/carta-escudo.jpg';
import cartaMachado from './assets/landing/carta-machado.jpg';
import cartaArco from './assets/landing/carta-arco.jpg';
import cartaPocao from './assets/landing/carta-pocao.jpg';
import cartaArmadilha from './assets/landing/carta-armadilha.jpg';

const GAME_URL = 'https://sequencia-card-game.squareweb.app';

function DecorCard({ src, sx }) {
  return (
    <Box
      component="img"
      alt=""
      src={src}
      sx={{
        position: 'absolute',
        width: { xs: 120, sm: 150, md: 180 },
        borderRadius: 2,
        opacity: 0.18,
        filter: 'drop-shadow(0 18px 30px rgba(0,0,0,.55))',
        pointerEvents: 'none',
        userSelect: 'none',
        ...sx,
      }}
    />
  );
}

export default function LandingPage() {
  const howToRef = useRef(null);
  const [openRules, setOpenRules] = useState(false);
  const [openContact, setOpenContact] = useState(false);
  const [snack, setSnack] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [contact, setContact] = useState({ name: '', email: '', message: '' });

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: { main: '#caa34a' },
          background: { default: '#0b0f16', paper: 'rgba(12,16,24,.86)' },
        },
        shape: { borderRadius: 16 },
        typography: {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          h2: { fontWeight: 900, letterSpacing: '-0.02em' },
          h4: { fontWeight: 800 },
          button: { textTransform: 'none', fontWeight: 700 },
        },
      }),
    []
  );

  const scrollToHowTo = () => {
    if (!howToRef.current) return;
    howToRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenGame = () => {
    window.open(GAME_URL, '_blank', 'noopener,noreferrer');
  };

  const submitContact = async (e) => {
    e.preventDefault();

    const name = contact.name.trim();
    const email = contact.email.trim();
    const message = contact.message.trim();

    if (!name || !email || !message) {
      setSnack('Preencha nome, e-mail e mensagem.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSnack('Informe um e-mail válido.');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`${SERVER_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Não foi possível enviar sua mensagem agora.');
      }

      setSnack(data?.message || 'Mensagem enviada com sucesso.');
      setContact({ name: '', email: '', message: '' });
      setOpenContact(false);
    } catch (error) {
      setSnack(error?.message || 'Erro ao enviar a mensagem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backdropFilter: 'blur(10px)',
            background: 'rgba(10,14,22,.75)',
            borderBottom: '1px solid rgba(255,255,255,.08)',
          }}
        >
          <Toolbar>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
              <Box component="img" src={logo} alt="ArchangelSoft" sx={{ height: 34, width: 'auto' }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Sequência Card Game
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Button startIcon={<HelpOutlineIcon />} color="inherit" onClick={scrollToHowTo}>
                Como Jogar
              </Button>
              <Button
                startIcon={<PlayArrowIcon />}
                variant="contained"
                onClick={() => setOpenRules(true)}
                sx={{ boxShadow: '0 18px 60px rgba(202,163,74,.18)' }}
              >
                Jogar
              </Button>
              <Button startIcon={<EmailIcon />} color="inherit" onClick={() => setOpenContact(true)}>
                Contate-nos
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* HERO */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `linear-gradient(180deg, rgba(8,10,14,.25), rgba(8,10,14,.92)), url(${boardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <DecorCard src={cartaVerso} sx={{ top: 42, left: -40, transform: 'rotate(-14deg)' }} />
            <DecorCard src={cartaEspada} sx={{ bottom: 26, left: 30, transform: 'rotate(10deg)' }} />
            <DecorCard src={cartaMachado} sx={{ top: 92, right: -36, transform: 'rotate(16deg)' }} />
            <DecorCard src={cartaEscudo} sx={{ bottom: 36, right: 18, transform: 'rotate(-12deg)' }} />
            <DecorCard
              src={cartaArco}
              sx={{
                top: { xs: 260, md: 180 },
                left: { xs: '55%', md: '46%' },
                transform: 'translateX(-50%) rotate(-6deg)',
                width: { xs: 120, sm: 150, md: 190 },
                opacity: 0.14,
              }}
            />
          </Box>

          <Container sx={{ py: { xs: 7, md: 10 } }}>
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={7}>
                <Typography variant="h2" sx={{ fontSize: { xs: 42, md: 60 }, lineHeight: 1.05 }}>
                  Estratégia rápida.
                  <Box component="span" sx={{ color: 'primary.main' }}>
                    {' '}
                    Caos glorioso.
                  </Box>
                </Typography>
                <Typography sx={{ mt: 2, maxWidth: 680, opacity: 0.92, fontSize: { xs: 16, md: 18 } }}>
                  Um card game dinâmico para 2 a 4 jogadores, com partidas rápidas, decisões táticas
                  e uma mesa que muda a cada rodada. Cada tipo de carta aparece apenas uma vez por sequência —
                  exceto a Poção.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
                  <Button size="large" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => setOpenRules(true)}>
                    Ver regras e jogar
                  </Button>
                  <Button size="large" color="inherit" variant="outlined" onClick={scrollToHowTo}>
                    Como funciona
                  </Button>
                </Stack>

              </Grid>

              <Grid item xs={12} md={5}>
                <Paper
                  sx={{
                    p: 2,
                    background: 'rgba(12,16,24,.70)',
                    border: '1px solid rgba(255,255,255,.10)',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Mini galeria
                  </Typography>
                  <Typography sx={{ opacity: 0.8, fontSize: 13, mb: 1.5 }}>
                    Veja o visual e o ritmo das partidas.
                  </Typography>

                  <Grid container spacing={1.25}>
                    <Grid item xs={6}>
                      <Box
                        component="img"
                        src={imagem01}
                        alt="Screenshot do jogo 1"
                        sx={{
                          width: '100%',
                          height: 160,
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '1px solid rgba(255,255,255,.12)',
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Box
                        component="img"
                        src={imagem02}
                        alt="Screenshot do jogo 2"
                        sx={{
                          width: '100%',
                          height: 160,
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '1px solid rgba(255,255,255,.12)',
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2, opacity: 0.18 }} />

                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography sx={{ opacity: 0.85, fontSize: 14 }}>
                      Entre na arena
                    </Typography>
                    <Button variant="outlined" color="inherit" onClick={() => setOpenRules(true)}>
                      Ver regras
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Container>
        </Box>



        {/* GALERIA */}
        <Box sx={{ position: 'relative', py: { xs: 6, md: 8 } }}>
          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <DecorCard src={cartaVerso} sx={{ top: -10, right: 40, transform: 'rotate(-8deg)', opacity: 0.10 }} />
            <DecorCard src={cartaEscudo} sx={{ bottom: -20, left: 40, transform: 'rotate(10deg)', opacity: 0.10 }} />
          </Box>

          <Container>
            <Typography variant="h4">Galeria</Typography>
            <Typography sx={{ mt: 1, maxWidth: 820, opacity: 0.86 }}>
              Confira duas cenas do jogo e veja a atmosfera da partida antes de entrar na arena.
            </Typography>

            <Grid container spacing={2.2} sx={{ mt: 2.5 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 1.2, border: '1px solid rgba(255,255,255,.10)' }}>
                  <Box
                    component="img"
                    src={imagem01}
                    alt="Screenshot do jogo 1"
                    sx={{ width: '100%', height: { xs: 220, md: 280 }, objectFit: 'cover', borderRadius: 2 }}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 1.2, border: '1px solid rgba(255,255,255,.10)' }}>
                  <Box
                    component="img"
                    src={imagem02}
                    alt="Screenshot do jogo 2"
                    sx={{ width: '100%', height: { xs: 220, md: 280 }, objectFit: 'cover', borderRadius: 2 }}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Container>
        </Box>


        {/* COMO JOGAR */}
        <Box ref={howToRef} sx={{ position: 'relative', py: { xs: 6, md: 8 } }}>
          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <DecorCard src={cartaPocao} sx={{ top: 20, right: -30, transform: 'rotate(18deg)', opacity: 0.12 }} />
            <DecorCard src={cartaArmadilha} sx={{ bottom: -10, left: -40, transform: 'rotate(-16deg)', opacity: 0.12 }} />
          </Box>

          <Container>
            <Typography variant="h4">Como jogar</Typography>
            <Typography sx={{ mt: 1, maxWidth: 820, opacity: 0.86 }}>
              A mecânica central é simples e estratégica: numa mesma sequência, cada tipo de carta comum só pode aparecer uma vez.
              Vence quem esvaziar a mão primeiro.
            </Typography>

            <Grid container spacing={2.2} sx={{ mt: 2.5 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.25, height: '100%', border: '1px solid rgba(255,255,255,.10)' }}>
                  <Typography sx={{ fontWeight: 900 }}>1) Preparação</Typography>
                  <Typography sx={{ mt: 1, opacity: 0.85 }}>
                    Entre numa partida (2 a 4 jogadores). Cada jogador começa com <b>8 cartas</b>. O monte fica no centro.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.25, height: '100%', border: '1px solid rgba(255,255,255,.10)' }}>
                  <Typography sx={{ fontWeight: 900 }}>2) Sua vez</Typography>
                  <Typography sx={{ mt: 1, opacity: 0.85 }}>
                    Jogue <b>1 carta</b> na mesa seguindo a regra de repetição. Se não tiver jogada possível,
                    o jogo compra automaticamente e passa a vez.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.25, height: '100%', border: '1px solid rgba(255,255,255,.10)' }}>
                  <Typography sx={{ fontWeight: 900 }}>3) Armadilha</Typography>
                  <Typography sx={{ mt: 1, opacity: 0.85 }}>
                    Se alguém jogar <b>Armadilha</b>, o próximo jogador precisa rolar um dado (1–6).
                    Ímpar: quem rolou compra 3. Par: quem armou compra 2.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.25, height: '100%', border: '1px solid rgba(255,255,255,.10)' }}>
                  <Typography sx={{ fontWeight: 900 }}>4) Fim da rodada</Typography>
                  <Typography sx={{ mt: 1, opacity: 0.85 }}>
                    A rodada termina quando a vez volta para quem iniciou a sequência. A mesa é limpa e um novo iniciador começa.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.25, height: '100%', border: '1px solid rgba(255,255,255,.10)' }}>
                  <Typography sx={{ fontWeight: 900 }}>5) Vitória</Typography>
                  <Typography sx={{ mt: 1, opacity: 0.85 }}>
                    Esvazie a mão antes dos adversários e conquiste a vitória. Rápido, estratégico e viciante.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
              <Button variant="contained" size="large" startIcon={<PlayArrowIcon />} onClick={() => setOpenRules(true)}>
                Jogar agora
              </Button>
              <Button variant="outlined" color="inherit" size="large" onClick={() => setOpenContact(true)}>
                Falar com a equipe
              </Button>
            </Stack>
          </Container>
        </Box>

        {/* FOOTER */}
        <Box
          component="footer"
          sx={{
            py: 3,
            borderTop: '1px solid rgba(255,255,255,.08)',
            background: 'rgba(10,14,22,.85)',
          }}
        >
          <Container>
            <Typography sx={{ opacity: 0.75, fontSize: 13 }}>
              Sequência Card Game - ArchangelSoft. Todos os direitos reservados.
            </Typography>
          </Container>
        </Box>
      </Box>

      {/* MODAL REGRAS */}
      <Dialog open={openRules} onClose={() => setOpenRules(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Regras do jogo
          <IconButton
            onClick={() => setOpenRules(false)}
            sx={{ position: 'absolute', right: 10, top: 10 }}
            aria-label="Fechar"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Typography sx={{ opacity: 0.9 }}>
              <b>Objetivo:</b> zerar sua mão antes dos outros.
            </Typography>

            <Typography sx={{ opacity: 0.9 }}>
              <b>Sequência (mesa):</b> cartas jogadas ficam na mesa até o fim da rodada.
              Cartas comuns (<b>Espada</b>, <b>Escudo</b>, <b>Machado</b>, <b>Arco</b>) não podem repetir tipo na mesma sequência.
              <b>Poção</b> pode repetir.
            </Typography>

            <Typography sx={{ opacity: 0.9 }}>
              <b>Turno:</b> jogue 1 carta válida. Se você estiver travado sem jogada possível, o jogo compra e passa a vez.
            </Typography>

            <Typography sx={{ opacity: 0.9 }}>
              <b>Armadilha:</b> ao jogar Armadilha, o próximo jogador deve rolar o dado.
              <br />
              • 1,3,5 → quem rolou compra 3 cartas
              <br />
              • 2,4,6 → quem jogou a armadilha compra 2 cartas
            </Typography>

            <Typography sx={{ opacity: 0.9 }}>
              <b>Fim da rodada:</b> quando a vez retorna ao iniciador, a mesa limpa e um novo iniciador começa.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRules(false)} color="inherit">
            Fechar
          </Button>
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleOpenGame}>
            Jogar (abrir)
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL CONTATO */}
      <Dialog open={openContact} onClose={() => setOpenContact(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Contate-nos
          <IconButton
            onClick={() => setOpenContact(false)}
            sx={{ position: 'absolute', right: 10, top: 10 }}
            aria-label="Fechar"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" onSubmit={submitContact}>
            <Stack spacing={2}>
              <TextField
                label="Nome"
                value={contact.name}
                onChange={(e) => setContact((s) => ({ ...s, name: e.target.value }))}
                fullWidth
              />
              <TextField
                label="E-mail"
                value={contact.email}
                onChange={(e) => setContact((s) => ({ ...s, email: e.target.value }))}
                type="email"
                fullWidth
              />
              <TextField
                label="Mensagem"
                value={contact.message}
                onChange={(e) => setContact((s) => ({ ...s, message: e.target.value }))}
                multiline
                minRows={4}
                fullWidth
              />
              <Button type="submit" variant="contained" startIcon={<EmailIcon />}>
                Enviar
              </Button>
              <Typography sx={{ opacity: 0.7, fontSize: 12 }}>
                Canal de contato em fase de integração.
              </Typography>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={2600}
        onClose={() => setSnack('')}
        message={snack}
      />
    </ThemeProvider>
  );
}
