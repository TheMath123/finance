import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CopyIcon,
  WhatsappLogoIcon,
} from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { env } from '@/env';
import { ApiError } from '@/lib/api-client';
import { whatsappApi } from '@/lib/whatsapp-api';

/** Vínculo do WhatsApp por OTP (spec: nasce no app, código de 6 dígitos, TTL de 5min). */
export default function WhatsAppLinkScreen() {
  const { user, refreshUser } = useSession();
  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!code) return;
    const tick = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1_000
    );
    return () => clearInterval(tick);
  }, [code]);

  // Enquanto o código está ativo, checa periodicamente se o vínculo já foi confirmado
  // (o backend confirma sozinho quando o webhook do WhatsApp recebe a mensagem).
  useEffect(() => {
    if (!code) return;
    pollRef.current = setInterval(() => {
      refreshUser().catch(() => {});
    }, 5_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [code]);

  useEffect(() => {
    if (user?.phone && code) {
      setCode(null);
      Alert.alert(
        'WhatsApp vinculado!',
        `O número ${user.phone} foi vinculado à sua conta.`
      );
    }
  }, [user?.phone]);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const started = await whatsappApi.startLink();
      setCode(started.code);
      setSecondsLeft(
        Math.max(
          0,
          Math.round(
            (new Date(started.expiresAt).getTime() - Date.now()) / 1000
          )
        )
      );
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof ApiError
          ? error.message
          : 'Não foi possível gerar o código.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
  };

  const openWhatsApp = () => {
    if (!code) return;
    const number = env.EXPO_PUBLIC_WHATSAPP_NUMBER;
    const text = encodeURIComponent(code);
    const url = number
      ? `https://wa.me/${number}?text=${text}`
      : `https://wa.me/?text=${text}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      await refreshUser();
    } finally {
      setChecking(false);
    }
  };

  const doRevoke = async () => {
    setRevoking(true);
    try {
      await whatsappApi.revokeLink();
      await refreshUser();
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof ApiError
          ? error.message
          : 'Não foi possível revogar o vínculo.'
      );
    } finally {
      setRevoking(false);
    }
  };

  const confirmRevoke = () => {
    Alert.alert(
      'Revogar vínculo do WhatsApp?',
      'Você vai parar de conseguir registrar transações por lá.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Revogar', style: 'destructive', onPress: doRevoke },
      ]
    );
  };

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Vincular WhatsApp</ThemedText>
      </View>

      {user?.phone ? (
        <Card className="gap-4">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircleIcon size={18} color="#059669" weight="fill" />
            </View>
            <View className="flex-1">
              <ThemedText type="smallBold">Vinculado</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {user.phone}
              </ThemedText>
            </View>
          </View>
          <Button
            variant="destructive"
            loading={revoking}
            onPress={confirmRevoke}
          >
            Revogar vínculo
          </Button>
        </Card>
      ) : code ? (
        <Card className="gap-4 items-center">
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={{ textAlign: 'center' }}
          >
            Envie esse código pelo WhatsApp, a partir do número que você quer
            vincular:
          </ThemedText>
          <Pressable
            onPress={copyCode}
            className="flex-row items-center gap-2 active:opacity-70"
          >
            <ThemedText type="title" style={{ letterSpacing: 4 }}>
              {code}
            </ThemedText>
            <CopyIcon size={20} />
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            {secondsLeft > 0
              ? `Expira em ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
              : 'Código expirado — gere outro.'}
          </ThemedText>
          {secondsLeft > 0 && (
            <Button
              icon={
                <WhatsappLogoIcon size={18} color="#fafafa" weight="fill" />
              }
              onPress={openWhatsApp}
            >
              Abrir WhatsApp
            </Button>
          )}
          <Button variant="ghost" loading={checking} onPress={checkNow}>
            Já enviei, verificar agora
          </Button>
          {secondsLeft <= 0 && (
            <Button
              variant="outline"
              loading={generating}
              onPress={generateCode}
            >
              Gerar novo código
            </Button>
          )}
        </Card>
      ) : (
        <Card className="gap-4">
          <ThemedText type="small" themeColor="textSecondary">
            Vincule seu WhatsApp pra registrar transações por lá, em conversa
            privada ou num grupo compartilhado. O vínculo nasce aqui no app:
            geramos um código, você envia pro nosso número a partir do WhatsApp
            que quer vincular, e pronto.
          </ThemedText>
          <Button loading={generating} onPress={generateCode}>
            Gerar código
          </Button>
        </Card>
      )}
    </Screen>
  );
}
