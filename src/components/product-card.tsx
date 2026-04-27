import React from 'react';
import { Image, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import type { Product } from '../types';
import { formatCurrency } from '../utils/format';

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (productId: number) => void;
}) {
  return (
    <Card mode="contained" style={{ flex: 1, maxWidth: '48%' }}>
      {product.image ? (
        <Image
          source={{ uri: product.image }}
          style={{
            backgroundColor: '#e9eef3',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            height: 120,
            width: '100%',
          }}
        />
      ) : null}
      <Card.Content style={{ gap: 8, paddingTop: 12 }}>
        <View style={{ gap: 4 }}>
          <Text numberOfLines={2} variant="titleSmall">
            {product.title}
          </Text>
          <Text style={{ opacity: 0.7 }} variant="bodySmall">
            {product.category?.name || 'Tanpa kategori'}
          </Text>
        </View>
        <Chip compact icon="package-variant-closed">
          Stok {product.stock}
        </Chip>
        <Text variant="titleMedium">{formatCurrency(product.sell_price)}</Text>
        <Button mode="contained-tonal" onPress={() => onAdd(product.id)}>
          Tambah
        </Button>
      </Card.Content>
    </Card>
  );
}
