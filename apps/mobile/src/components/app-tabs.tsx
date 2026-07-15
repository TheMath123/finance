import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { HouseIcon, ReceiptIcon, type IconProps } from 'phosphor-react-native';
import { type ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'home', href: '/index' as const, label: 'Resumo', Icon: HouseIcon },
  { name: 'explore', href: '/explore' as const, label: 'Transações', Icon: ReceiptIcon },
] satisfies { name: string; href: string; label: string; Icon: ComponentType<IconProps> }[];

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
    <Pressable {...props} className="active:opacity-70">
      <View
        className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 ${
          isFocused ? 'bg-brand-600' : ''
        }`}>
        <Icon color={isFocused ? '#FFFFFF' : theme.textSecondary} size={20} weight={isFocused ? 'fill' : 'regular'} />
        <ThemedText
          type="smallBold"
          themeColor={isFocused ? undefined : 'textSecondary'}
          style={isFocused ? { color: '#FFFFFF' } : undefined}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} className="absolute bottom-0 w-full flex-row items-center justify-center p-4">
      <ThemedView
        type="backgroundElement"
        className="flex-row justify-center gap-1 rounded-full p-1.5 shadow-md"
        style={{ maxWidth: MaxContentWidth }}>
        {props.children}
      </ThemedView>
    </View>
  );
}
