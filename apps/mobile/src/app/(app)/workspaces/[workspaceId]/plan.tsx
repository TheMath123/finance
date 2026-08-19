import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeftIcon, CreditCardIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { BrandColors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';
import { formatCents } from '@/lib/money';
import {
  type PlanPriceView,
  type PlanView,
  workspaceApi,
} from '@/lib/workspace-api';

const RETURN_URL = 'mobile://billing-return';

const INTERVAL_LABELS: Record<string, string> = {
  day: 'dia',
  week: 'semana',
  month: 'mês',
  year: 'ano',
};

const STATUS_LABELS: Record<string, string> = {
  none: 'Sem assinatura',
  trialing: 'Em trial',
  active: 'Ativa',
  past_due: 'Pagamento atrasado',
  canceled: 'Cancelada',
  incomplete: 'Incompleta',
};

function priceLabel(price: PlanPriceView): string {
  const interval =
    price.billingIntervalCount > 1
      ? `a cada ${price.billingIntervalCount} ${INTERVAL_LABELS[price.billingIntervalUnit]}s`
      : INTERVAL_LABELS[price.billingIntervalUnit];
  return `${formatCents(price.priceCents)} / ${interval}`;
}

export default function WorkspacePlanScreen() {
  const theme = useTheme();
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>();
  const [selectedPriceId, setSelectedPriceId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const { data: members } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => workspaceApi.listMembers(workspaceId),
  });
  const isOwner = members?.find((m) => m.userId === user?.id)?.role === 'owner';

  const { data: billing, isLoading } = useQuery({
    queryKey: ['workspace-billing', workspaceId],
    queryFn: () => workspaceApi.getBillingStatus(workspaceId),
  });

  const { data: plans } = useQuery({
    queryKey: ['available-plans'],
    queryFn: () => workspaceApi.listAvailablePlans(),
    enabled: pickerOpen,
  });

  const refreshBilling = () =>
    queryClient.invalidateQueries({
      queryKey: ['workspace-billing', workspaceId],
    });

  const selectedPlan = plans?.find((p: PlanView) => p.id === selectedPlanId);

  const openPicker = () => {
    setSelectedPlanId(undefined);
    setSelectedPriceId(undefined);
    setPickerOpen(true);
  };

  const startCheckout = async () => {
    if (!selectedPlanId || !selectedPriceId) return;
    setSubmitting(true);
    try {
      const { checkoutUrl } = await workspaceApi.startCheckout(workspaceId, {
        planId: selectedPlanId,
        planPriceId: selectedPriceId,
        successUrl: RETURN_URL,
        cancelUrl: RETURN_URL,
      });
      setPickerOpen(false);
      await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_URL);
      refreshBilling();
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof ApiError
          ? error.message
          : 'Não foi possível iniciar o checkout.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openPortal = async () => {
    setSubmitting(true);
    try {
      const { portalUrl } = await workspaceApi.startBillingPortal(
        workspaceId,
        RETURN_URL
      );
      await WebBrowser.openAuthSessionAsync(portalUrl, RETURN_URL);
      refreshBilling();
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof ApiError
          ? error.message
          : 'Não foi possível abrir o portal de assinatura.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Assinatura</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-4 self-start" />
      ) : billing ? (
        <>
          <Card className="items-center gap-2 py-6">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <CreditCardIcon size={18} color={BrandColors.primary} />
            </View>
            <ThemedText type="title">{billing.plan.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {STATUS_LABELS[billing.subscriptionStatus] ??
                billing.subscriptionStatus}
              {billing.planPrice ? ` · ${priceLabel(billing.planPrice)}` : ''}
            </ThemedText>
            {billing.trialEndsAt && (
              <ThemedText type="small" themeColor="textSecondary">
                Trial até{' '}
                {new Date(billing.trialEndsAt).toLocaleDateString('pt-BR')}
              </ThemedText>
            )}
            {billing.cancelAtPeriodEnd && billing.currentPeriodEndsAt && (
              <ThemedText type="small" themeColor="textSecondary">
                Cancelada — acesso até{' '}
                {new Date(billing.currentPeriodEndsAt).toLocaleDateString(
                  'pt-BR'
                )}
              </ThemedText>
            )}
          </Card>

          <Card className="gap-1">
            <ThemedText type="smallBold">Limites do plano</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {billing.plan.limits.maxOwnedSharedWorkspaces} workspace(s)
              compartilhado(s)
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {billing.plan.limits.maxMembersPerWorkspace} membro(s) por
              workspace
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {billing.plan.limits.maxSavedFormulasPerWorkspace} fórmula(s)
              salva(s)
            </ThemedText>
          </Card>

          {!isOwner ? (
            <ThemedText type="small" themeColor="textSecondary">
              Só o dono do workspace pode assinar ou gerenciar a assinatura.
            </ThemedText>
          ) : billing.hasStripeCustomer ? (
            <Button loading={submitting} onPress={openPortal}>
              Gerenciar assinatura
            </Button>
          ) : (
            <Button loading={submitting} onPress={openPicker}>
              Assinar um plano
            </Button>
          )}
        </>
      ) : null}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolher plano</DialogTitle>
          </DialogHeader>
          <Select
            options={(plans ?? []).map((p: PlanView) => ({
              label: p.name,
              value: p.id,
            }))}
            value={selectedPlanId}
            onValueChange={(value) => {
              setSelectedPlanId(value);
              const plan = plans?.find((p: PlanView) => p.id === value);
              setSelectedPriceId(
                plan?.prices.find((pr) => pr.isDefault)?.id ??
                  plan?.prices[0]?.id
              );
            }}
            placeholder="Selecione o plano"
          />
          {selectedPlan && selectedPlan.prices.length > 0 && (
            <Select
              options={selectedPlan.prices.map((price) => ({
                label: priceLabel(price),
                value: price.id,
              }))}
              value={selectedPriceId}
              onValueChange={setSelectedPriceId}
              placeholder="Selecione a recorrência"
            />
          )}
          <DialogFooter>
            <Button variant="ghost" onPress={() => setPickerOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={submitting}
              disabled={!selectedPlanId || !selectedPriceId}
              onPress={startCheckout}
            >
              Assinar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
