import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { TextField } from '@/components/form/text-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { createWorkspaceSchema, type CreateWorkspaceInput } from '@/lib/schemas/workspace';
import { workspaceApi } from '@/lib/workspace-api';

interface CreateWorkspaceFormProps {
  onDone: (workspaceId: string) => void;
}

export function CreateWorkspaceForm({ onDone }: CreateWorkspaceFormProps) {
  const queryClient = useQueryClient();
  const { switchWorkspace } = useSession();
  const { control, handleSubmit } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: 'onTouched',
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: (input: CreateWorkspaceInput) => workspaceApi.create(input),
    onSuccess: async (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      await switchWorkspace(workspace.id);
      onDone(workspace.id);
    },
  });

  return (
    <View className="gap-4">
      <TextField
        control={control}
        name="name"
        label="Nome do workspace"
        placeholder="Ex.: Família Silva"
      />
      {mutation.isError && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Erro inesperado'}
        </ThemedText>
      )}
      <Button loading={mutation.isPending} onPress={handleSubmit((input) => mutation.mutate(input))}>
        Criar workspace
      </Button>
    </View>
  );
}
