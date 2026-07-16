import type { Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { BellIcon, HouseIcon, ReceiptIcon, WalletIcon, type IconProps } from 'phosphor-react-native';
import { type ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/cn';

// "/" é o path correto em runtime para o index de um grupo, mas o gerador de
// tipos do expo-router não expõe esse literal (só "/index", que resolve para
// +not-found) — daqui o cast explícito.
const TABS = [
  { name: 'home', href: '/' as Href, label: 'Resumo', Icon: HouseIcon },
  { name: 'explore', href: '/explore' as Href, label: 'Transações', Icon: ReceiptIcon },
  { name: 'accounts', href: '/accounts' as Href, label: 'Contas', Icon: WalletIcon },
  { name: 'notifications', href: '/notifications' as Href, label: 'Avisos', Icon: BellIcon },
] satisfies { name: string; href: Href; label: string; Icon: ComponentType<IconProps> }[];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map(({ name, href, label, Icon }) => (
            <TabTrigger key={name} name={name} href={href} asChild>
              <TabButton icon={Icon}>{label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
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
      style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      className={cn(
        'flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 active:opacity-70',
        isFocused && 'bg-primary',
      )}
      android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}>
      <Icon color={isFocused ? '#FFFFFF' : theme.textSecondary} size={16} weight={isFocused ? 'fill' : 'regular'} />
      <ThemedText
        type="small"
        themeColor={isFocused ? undefined : 'textSecondary'}
        style={[
          { fontSize: 10, lineHeight: 12, fontWeight: '400' },
          isFocused ? { color: '#FFFFFF' } : undefined,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} className="absolute bottom-0 w-full flex-row items-center justify-center p-4">
      <ThemedView
        type="backgroundElement"
        className="w-full flex-row justify-between gap-4 rounded-lg p-2 shadow-md"
        style={{ maxWidth: MaxContentWidth }}>
        {props.children}
      </ThemedView>
    </View>
  );
}
