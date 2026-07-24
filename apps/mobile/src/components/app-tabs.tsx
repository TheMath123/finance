import { BlurView } from 'expo-blur';
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
import { Pressable, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

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
      <View className="overflow-hidden rounded-lg" style={{ height: 58 }}>
        {/*
          expo-blur só faz blur de verdade no iOS — no Android (mesmo com blurMethod setado,
          conforme o próprio README do pacote) o suporte é experimental/instável e pode nem estar
          presente no binário do Expo Go instalado, então cai num View translúcido simples.
          Deixando sem blurMethod (default 'none') pra não fingir um efeito que não é garantido: o
          tint mais forte abaixo (bg-primary/20) é a aproximação honesta pro Android.
        */}
        <BlurView
          intensity={30}
          tint={dark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
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
