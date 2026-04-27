import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 32,
      }}
    >
      <Text variant="displaySmall">{icon === 'cart-off' ? '[]' : '::'}</Text>
      <Text variant="titleMedium">{title}</Text>
      <Text style={{ opacity: 0.68, textAlign: 'center' }} variant="bodyMedium">
        {description}
      </Text>
    </View>
  );
}
