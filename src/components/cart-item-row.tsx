import React from 'react';
import { View } from 'react-native';
import { IconButton, Surface, Text } from 'react-native-paper';
import type { CartItem } from '../types';
import { formatCurrency } from '../utils/format';

export function CartItemRow({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  return (
    <Surface
      style={{
        borderRadius: 16,
        gap: 10,
        padding: 12,
      }}
      elevation={0}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="titleSmall">{item.product.title}</Text>
          <Text variant="bodySmall">{formatCurrency(item.product.sell_price)}</Text>
        </View>
        <IconButton icon="trash-can-outline" onPress={onRemove} />
      </View>

      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', flexDirection: 'row' }}>
          <IconButton disabled={item.qty <= 1} icon="minus-circle-outline" onPress={onDecrease} />
          <Text variant="titleMedium">{item.qty}</Text>
          <IconButton icon="plus-circle-outline" onPress={onIncrease} />
        </View>
        <Text variant="titleMedium">{formatCurrency(item.line_total)}</Text>
      </View>
    </Surface>
  );
}
