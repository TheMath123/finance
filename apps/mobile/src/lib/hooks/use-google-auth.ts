import { Platform } from 'react-native';

import { env } from '@/env';

/** Sem o client Web configurado, o `idToken` nunca vem — nem vale mostrar o botão "Continuar com Google" (ver login-form.tsx/register-form.tsx). */
export const googleAuthAvailable = Boolean(env.EXPO_PUBLIC_CLIENT_ID);

type GoogleSigninModule =
  typeof import('@react-native-google-signin/google-signin');

let googleSigninModule: GoogleSigninModule | null = null;

/**
 * `@react-native-google-signin/google-signin` lança erro só de ser
 * **importado** (TurboModuleRegistry.getEnforcing no módulo nativo) quando o
 * binário instalado não tem o módulo nativo compilado — Expo Go puro ou um
 * dev client antigo, de antes desta lib entrar. Um `import` estático no topo
 * deste arquivo derrubaria o app inteiro no boot (este arquivo é importado
 * por context/session.tsx, carregado sempre) mesmo pra quem nunca toca no
 * botão de Google. Mesmo padrão já usado em lib/push-notifications.ts pro
 * mesmo tipo de problema com expo-notifications: `require` dinâmico, só
 * chamado de dentro de uma função, nunca no topo do módulo.
 */
function loadGoogleSignin(): GoogleSigninModule {
  if (!googleSigninModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- import estático quebraria o boot sem dev client rebuildado (ver comentário acima)
    const mod = require('@react-native-google-signin/google-signin');
    googleSigninModule = mod as GoogleSigninModule;
  }
  return googleSigninModule;
}

let configured = false;

function isNativeModuleError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

/**
 * Abre o seletor de conta nativo do Google (GoogleSignin, não
 * expo-auth-session — a doc atual do Expo recomenda a lib oficial do
 * provedor em vez do fluxo genérico via browser, ver AGENTS.md deste app) e
 * devolve o `idToken` (JWT) pra mandar pro backend (`/auth/google` ou
 * `/auth/me/google/link`). `null` = usuário cancelou (não é erro). Qualquer
 * outra falha lança com mensagem já em pt-BR, pronta pra mostrar na tela —
 * inclusive "módulo nativo ausente" (dev client sem rebuild), que também
 * cai aqui em vez de derrubar o app.
 */
export async function signInWithGoogle(): Promise<string | null> {
  let mod: GoogleSigninModule;
  try {
    mod = loadGoogleSignin();
  } catch {
    // O `require` acima é o único ponto onde o erro do TurboModuleRegistry
    // pode estourar — sem `statusCodes` nem nada do módulo disponível aqui,
    // só dá pra devolver uma mensagem genérica de "precisa reinstalar".
    throw new Error(
      'Login com Google indisponível nesta instalação do app — reinstale a versão mais recente.'
    );
  }

  const { GoogleSignin, statusCodes } = mod;

  try {
    if (!configured) {
      GoogleSignin.configure({
        webClientId: env.EXPO_PUBLIC_CLIENT_ID,
        iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      });
      configured = true;
    }

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') return null;

    if (!response.data.idToken) {
      throw new Error(
        'O Google não retornou um token de identidade — tente novamente.'
      );
    }
    return response.data.idToken;
  } catch (error) {
    if (isNativeModuleError(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Login com Google já está em andamento.');
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error(
          'Google Play Services não está disponível neste aparelho.'
        );
      }
      throw new Error('Não foi possível entrar com o Google. Tente novamente.');
    }
    // Já é um Error com mensagem nossa (ex.: sem idToken) — repassa como está.
    if (error instanceof Error) throw error;
    throw new Error('Não foi possível entrar com o Google. Tente novamente.');
  }
}

/** Encerra a sessão Google local (não mexe na conta/vínculo no backend) — chamar junto do signOut geral, senão o próximo `signIn()` reabre direto na última conta usada sem mostrar o seletor. Sem sessão Google local pra encerrar (ou módulo nativo indisponível) não é um erro real. */
export async function signOutGoogleLocally(): Promise<void> {
  if (!googleAuthAvailable) return;
  try {
    const { GoogleSignin } = loadGoogleSignin();
    await GoogleSignin.signOut();
  } catch {
    // Sem sessão Google local, ou módulo nativo indisponível — tanto faz aqui.
  }
}
