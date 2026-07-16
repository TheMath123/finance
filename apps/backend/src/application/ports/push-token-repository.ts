export interface PushTokenRepository {
  register(userId: string, token: string): Promise<void>;
  /** Escopado ao dono — impede que alguém apague o token de outro usuário só sabendo o valor. */
  unregister(userId: string, token: string): Promise<void>;
  listByUser(userId: string): Promise<string[]>;
}
