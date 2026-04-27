import React from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Searchbar, Surface, Text } from 'react-native-paper';
import type { Category, Product } from '../types';
import { EmptyState } from './empty-state';
import { ProductCard } from './product-card';

type ProductCatalogPanelProps = {
  categories: Category[];
  productSearch: string;
  selectedCategory: number | null;
  products: Product[];
  productsLoading: boolean;
  productPage: number;
  productLastPage: number;
  productTotal: number;
  onAddProduct: (productId: number) => void;
  onProductSearchChange: (value: string) => void;
  onSelectedCategoryChange: (value: number | null) => void;
  onProductPageChange: (value: number) => void;
};

export function ProductCatalogPanel({
  categories,
  productSearch,
  selectedCategory,
  products,
  productsLoading,
  productPage,
  productLastPage,
  productTotal,
  onAddProduct,
  onProductSearchChange,
  onSelectedCategoryChange,
  onProductPageChange,
}: ProductCatalogPanelProps) {
  return (
    <>
      <Searchbar
        onChangeText={onProductSearchChange}
        placeholder="Cari nama, barcode, atau SKU"
        value={productSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.horizontalChips}>
          <Chip
            icon={selectedCategory === null ? 'check' : undefined}
            onPress={() => onSelectedCategoryChange(null)}
            selected={selectedCategory === null}
          >
            Semua
          </Chip>
          {categories.map((category) => (
            <Chip
              icon={selectedCategory === category.id ? 'check' : undefined}
              key={category.id}
              onPress={() => onSelectedCategoryChange(category.id)}
              selected={selectedCategory === category.id}
            >
              {category.name}
            </Chip>
          ))}
        </View>
      </ScrollView>

      <Surface mode="flat" style={styles.paginationSummary}>
        <View style={styles.summaryTextWrap}>
          <Text variant="titleSmall">Katalog produk</Text>
          <Text style={styles.mutedText} variant="bodySmall">
            Menampilkan {products.length} produk dari total {productTotal}
          </Text>
        </View>
        <Chip compact icon="file-document-outline" style={styles.neutralChip}>
          Hal. {productPage}/{productLastPage}
        </Chip>
      </Surface>

      {productsLoading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator animating />
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          description="Coba ubah kata kunci atau kategori."
          icon="package-variant-closed-remove"
          title="Produk tidak ditemukan"
        />
      ) : (
        <FlatList
          columnWrapperStyle={styles.productGrid}
          contentContainerStyle={styles.productList}
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          renderItem={({ item }) => <ProductCard onAdd={onAddProduct} product={item} />}
          scrollEnabled={false}
        />
      )}

      {productTotal > 0 ? (
        <View style={styles.paginationControls}>
          <Button
            disabled={productsLoading || productPage <= 1}
            icon="chevron-left"
            mode="outlined"
            onPress={() => onProductPageChange(Math.max(1, productPage - 1))}
          >
            Sebelumnya
          </Button>
          <Button
            disabled={productsLoading || productPage >= productLastPage}
            icon="chevron-right"
            contentStyle={styles.paginationButtonContent}
            mode="contained-tonal"
            onPress={() => onProductPageChange(Math.min(productLastPage, productPage + 1))}
          >
            Berikutnya
          </Button>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  horizontalChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  mutedText: {
    opacity: 0.72,
  },
  neutralChip: {
    backgroundColor: '#eef2f6',
  },
  paginationButtonContent: {
    flexDirection: 'row-reverse',
  },
  paginationControls: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  paginationSummary: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  productGrid: {
    gap: 12,
    justifyContent: 'space-between',
  },
  productList: {
    gap: 12,
  },
  summaryTextWrap: {
    flex: 1,
  },
});
