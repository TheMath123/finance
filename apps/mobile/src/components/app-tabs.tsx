import type { Href } from 'expo-router';
import {
  TabList,
  type TabListProps,
  TabSlot,
  Tabs,
  TabTrigger,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import {
  BellIcon,
  HouseIcon,
  type IconProps,
  ReceiptIcon,
  SquaresFourIcon,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/cn';

// "/" é o path correto em runtime para o index de um grupo, mas o gerador de
// tipos do expo-router não expõe esse literal (só "/index", que resolve para
// +not-found) — daqui o cast explícito.
const TABS = [
  { name: 'home', href: '/' as Href, Icon: HouseIcon },
  { name: 'explore', href: '/explore' as Href, Icon: ReceiptIcon },
  { name: 'accounts', href: '/accounts' as Href, Icon: SquaresFourIcon },
  { name: 'notifications', href: '/notifications' as Href, Icon: BellIcon },
] satisfies { name: string; href: Href; Icon: ComponentType<IconProps> }[];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map(({ name, href, Icon }) => (
            <TabTrigger key={name} name={name} href={href} asChild>
              <TabButton icon={Icon} />
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  isFocused,
  icon: Icon,
  ...props
}: TabTriggerSlotProps & { icon: ComponentType<IconProps> }) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      // TabTrigger (asChild) injeta style={flexDirection:'row', justifyContent:'space-between'}
      // por padrão — sobrepõe o className do NativeWind, então precisa ser cancelado aqui.
      style={{
        height: '100%',
        width: 42,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className={cn('rounded-lg active:opacity-70', isFocused && 'bg-primary')}
      android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
    >
      <Icon
        color={isFocused ? '#FFFFFF' : theme.textSecondary}
        size={16}
        weight={isFocused ? 'fill' : 'regular'}
      />
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View
      {...props}
      // TabList (asChild) injeta style={flexDirection:'row', justifyContent:'space-between'} por
      // padrão — sobrepõe o className do NativeWind (mesmo problema do TabTrigger em TabButton
      // acima), por isso precisa ser cancelado aqui com um style explícito.
      style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      {/*
        Mantém o mesmo visual (tint bg-primary/20), mas com uma camada opaca (bg-card) por
        baixo — antes só existia o tint translúcido + BlurView, e no Android o expo-blur não
        faz blur de verdade (suporte experimental/instável, ausente no binário do Expo Go),
        então virava um View semi-transparente puro deixando o conteúdo da tela vazar através
        da barra. Com o bg-card opaco por trás, o tint continua com a mesma cor/aparência de
        antes, só que sem nada vazando.
      */}
      <View
        className="overflow-hidden rounded-lg bg-card"
        style={{ height: 58 }}
      >
        <View
          className="flex-row items-center gap-4 bg-primary/20 p-2"
          style={{ height: 58 }}
        >
          {props.children}
        </View>
      </View>
    </View>
  );
}
