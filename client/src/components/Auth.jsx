import React, { useMemo, useState } from 'react';
import { AVATARS, AvatarImg } from './avatars.jsx';

const USERS_KEY = 'sequencia_users_v1';

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export default function Auth({ onAuth }) {
  const [tab, setTab] = useState('login'); // login | register

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('mage');
  const [confirm, setConfirm] = useState('');

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleLogin = (e) => {
    e.preventDefault();
    const users = loadUsers();
    const u = users[normalizedEmail];
    if (!u) {
      alert('Usuário não encontrado. Faça o cadastro.');
      setTab('register');
      return;
    }
    if (u.password !== password) {
      alert('Senha incorreta.');
      return;
    }
    onAuth?.({ name: u.name, email: u.email, avatar: u.avatar || 'mage' });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return alert('Informe seu nome.');
    if (!normalizedEmail || !normalizedEmail.includes('@')) return alert('Informe um e-mail válido.');
    if (!password || password.length < 4) return alert('Senha muito curta (mín. 4 caracteres).');
    if (password !== confirm) return alert('As senhas não conferem.');

    const users = loadUsers();
    if (users[normalizedEmail]) {
      alert('Esse e-mail já está cadastrado. Faça login.');
      setTab('login');
      return;
    }

    users[normalizedEmail] = {
      name: n,
      email: normalizedEmail,
      password,
      avatar,
      createdAt: new Date().toISOString(),
    };
    saveUsers(users);

    onAuth?.({ name: n, email: normalizedEmail, avatar });
  };

  return (
    <div className="authShell">
      <div className="authCard">
        <div className="authHeader">
          <div>
            <div className="authTitle">Sequência</div>
            <div className="authSubtitle">Entre para jogar — simples, rápido e sem drama.</div>
          </div>
          <div className="authTabs">
            <button
              type="button"
              className={tab === 'login' ? 'authTab active' : 'authTab'}
              onClick={() => setTab('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              className={tab === 'register' ? 'authTab active' : 'authTab'}
              onClick={() => setTab('register')}
            >
              Cadastrar
            </button>
          </div>
        </div>

        {tab === 'login' ? (
          <form className="authForm" onSubmit={handleLogin}>
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </label>

            <button className="authPrimary" type="submit">Entrar</button>

            <div className="authHint">
              Não tem conta? <button type="button" className="btnLink" onClick={() => setTab('register')}>Cadastrar agora</button>
            </div>
          </form>
        ) : (
          <form className="authForm" onSubmit={handleRegister}>
            <label>
              Nome
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mín. 4 caracteres"
                required
              />
            </label>
            <label>
              Confirmar senha
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="repita a senha"
                required
              />
            </label>

            <div className="authAvatarSection">
              <div className="authAvatarTitle">Escolha seu avatar</div>
              <div className="avatarGrid">
                {Object.values(AVATARS).map((a) => (
                  <button
                    type="button"
                    key={a.key}
                    className={avatar === a.key ? 'avatarPick active' : 'avatarPick'}
                    onClick={() => setAvatar(a.key)}
                    title={a.label}
                  >
                    <AvatarImg avatarKey={a.key} alt={a.label} size={56} />
                    <div className="avatarLabel">{a.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <button className="authPrimary" type="submit">Criar conta</button>

            <div className="authHint">
              Já tem conta? <button type="button" className="btnLink" onClick={() => setTab('login')}>Entrar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
