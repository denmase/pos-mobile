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
    <Card
      mode="contained"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        flex: 1,
        maxWidth: '48%',
        overflow: 'hidden',
      }}
    >
      {product.image ? (
        <Image
          source={{ uri: product.image }}
          style={{
            backgroundColor: '#eef2f6',
            height: 132,
            width: '100%',
          }}
        />
      ) : (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#eef2f6',
            height: 132,
            justifyContent: 'center',
          }}
        >
          <Chip compact icon="image-off-outline">
            Tanpa gambar
          </Chip>
        </View>
      )}
      <Card.Content style={{ gap: 10, paddingTop: 14 }}>
        <View style={{ gap: 4 }}>
          <Text numberOfLines={2} variant="titleSmall">
            {product.title}
          </Text>
          <Text style={{ opacity: 0.7 }} variant="bodySmall">
            {product.category?.name || 'Tanpa kategori'}
          </Text>
        </View>
        <Chip compact icon="package-variant-closed" style={{ alignSelf: 'flex-start' }}>
          Stok {product.stock}
        </Chip>
        <Text variant="titleMedium">{formatCurrency(product.sell_price)}</Text>
        <Button mode="contained" onPress={() => onAdd(product.id)}>
          Tambah
        </Button>
      </Card.Content>
    </Card>
  );
}
