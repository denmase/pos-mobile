import React from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  BottomNavigation,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  Divider,
  HelperText,
  IconButton,
  List,
  Modal,
  PaperProvider,
  Portal,
  Searchbar,
  SegmentedButtons,
  Snackbar,
  Surface,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ApiError,
  loginRequest,
  mobileRequest,
  normalizeBaseUrl,
} from './src/lib/api';
import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession,
  type StoredSession,
} from './src/lib/storage';
import { appTheme } from './src/theme';
import type {
  BankAccount,
  BootstrapPayload,
  CartPayload,
  Customer,
  HeldCart,
  LoginResponse,
  PaymentGateway,
  Product,
  TransactionDetail,
  TransactionSummary,
  User,
} from './src/types';
import { formatCurrency, formatDateTime } from './src/utils/format';
import { CartItemRow } from './src/components/cart-item-row';
import { EmptyState } from './src/components/empty-state';
import { ProductCard } from './src/components/product-card';

const DEFAULT_API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api/mobile'
);

type Session = StoredSession & { user: User };
type SnackbarState = { visible: boolean; message: string };
type AddCustomerForm = {
  name: string;
  no_telp: string;
  address: string;
};

export default function App() {
  const [booting, setBooting] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = React.useState(DEFAULT_API_BASE_URL);
  const [email, setEmail] = React.useState('cashier@gmail.com');
  const [password, setPassword] = React.useState('password');
  const [submittingLogin, setSubmittingLogin] = React.useState(false);
  const [initializing, setInitializing] = React.useState(false);
  const [bootstrap, setBootstrap] = React.useState<BootstrapPayload | null>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(false);
  const [productSearch, setProductSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<number | null>(null);
  const [transactions, setTransactions] = React.useState<TransactionSummary[]>([]);
  const [historySearch, setHistorySearch] = React.useState('');
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [transactionDetail, setTransactionDetail] = React.useState<TransactionDetail | null>(null);
  const [transactionDetailLoading, setTransactionDetailLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>({
    visible: false,
    message: '',
  });
  const [refreshingDashboard, setRefreshingDashboard] = React.useState(false);

  const notify = React.useCallback((message: string) => {
    setSnackbar({ visible: true, message });
  }, []);

  const loadBootstrap = React.useCallback(
    async (activeSession: Session) => {
      const data = await mobileRequest<BootstrapPayload>(activeSession.baseUrl, '/bootstrap', {
        token: activeSession.token,
      });
      setBootstrap(data);
    },
    []
  );

  const loadProducts = React.useCallback(
    async (activeSession: Session, search = '', categoryId: number | null = null) => {
      setProductsLoading(true);
      try {
        const payload = await mobileRequest<{ data: Product[] }>(activeSession.baseUrl, '/products', {
          token: activeSession.token,
          query: {
            per_page: 60,
            search: search || undefined,
            category_id: categoryId ?? undefined,
          },
        });
        setProducts(payload.data);
      } finally {
        setProductsLoading(false);
      }
    },
    []
  );

  const loadTransactions = React.useCallback(
    async (activeSession: Session, search = '') => {
      setHistoryLoading(true);
      try {
        const payload = await mobileRequest<{ data: TransactionSummary[] }>(
          activeSession.baseUrl,
          '/transactions',
          {
            token: activeSession.token,
            query: {
              per_page: 30,
              search: search || undefined,
            },
          }
        );
        setTransactions(payload.data);
      } finally {
        setHistoryLoading(false);
      }
    },
    []
  );

  const hydrateSession = React.useCallback(
    async (stored: StoredSession) => {
      const draftSession = {
        ...stored,
        user: {
          id: 0,
          name: '',
          email: '',
          avatar: null,
          roles: [],
          permissions: [],
        },
      };

      const mePayload = await mobileRequest<{ user: User }>(stored.baseUrl, '/me', {
        token: stored.token,
      });

      const activeSession: Session = {
        ...stored,
        user: mePayload.user,
      };

      setSession(activeSession);
      setApiBaseUrlDraft(stored.baseUrl);
      await Promise.all([
        loadBootstrap(activeSession),
        loadProducts(activeSession, productSearch, selectedCategory),
        loadTransactions(activeSession, historySearch),
      ]);

      return draftSession;
    },
    [historySearch, loadBootstrap, loadProducts, loadTransactions, productSearch, selectedCategory]
  );

  React.useEffect(() => {
    const run = async () => {
      try {
        const stored = await getStoredSession();
        if (stored) {
          await hydrateSession(stored);
        }
      } catch {
        await clearStoredSession();
      } finally {
        setBooting(false);
      }
    };

    void run();
  }, [hydrateSession]);

  React.useEffect(() => {
    if (!session) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void loadProducts(session, productSearch, selectedCategory);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [loadProducts, productSearch, selectedCategory, session]);

  React.useEffect(() => {
    if (!session) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void loadTransactions(session, historySearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [historySearch, loadTransactions, session]);

  const handleLogin = React.useCallback(async () => {
    setSubmittingLogin(true);

    try {
      const baseUrl = normalizeBaseUrl(apiBaseUrlDraft);
      const payload = await loginRequest<LoginResponse>(baseUrl, {
        email,
        password,
        device_name: 'react-native-paper-pos',
      });

      const activeSession: Session = {
        token: payload.token,
        baseUrl,
        user: payload.user,
      };

      await saveStoredSession({
        token: activeSession.token,
        baseUrl: activeSession.baseUrl,
      });
      setSession(activeSession);
      await Promise.all([
        loadBootstrap(activeSession),
        loadProducts(activeSession),
        loadTransactions(activeSession),
      ]);
      notify(`Selamat datang, ${payload.user.name}.`);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Login gagal. Periksa URL API, email, dan password.';
      notify(message);
    } finally {
      setSubmittingLogin(false);
    }
  }, [apiBaseUrlDraft, email, loadBootstrap, loadProducts, loadTransactions, notify, password]);

  const handleLogout = React.useCallback(async () => {
    if (session) {
      try {
        await mobileRequest(session.baseUrl, '/logout', {
          method: 'POST',
          token: session.token,
        });
      } catch {
        // ignore logout API failures; local cleanup still matters
      }
    }

    await clearStoredSession();
    setSession(null);
    setBootstrap(null);
    setProducts([]);
    setTransactions([]);
    notify('Session mobile sudah ditutup.');
  }, [notify, session]);

  const refreshAll = React.useCallback(async () => {
    if (!session) {
      return;
    }

    setRefreshingDashboard(true);
    try {
      await Promise.all([
        loadBootstrap(session),
        loadProducts(session, productSearch, selectedCategory),
        loadTransactions(session, historySearch),
      ]);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Gagal memuat ulang data.');
    } finally {
      setRefreshingDashboard(false);
    }
  }, [
    historySearch,
    loadBootstrap,
    loadProducts,
    loadTransactions,
    notify,
    productSearch,
    selectedCategory,
    session,
  ]);

  const openTransactionDetail = React.useCallback(
    async (invoice: string) => {
      if (!session) {
        return;
      }

      setTransactionDetailLoading(true);
      try {
        const payload = await mobileRequest<{ transaction: TransactionDetail }>(
          session.baseUrl,
          `/transactions/${invoice}`,
          {
            token: session.token,
          }
        );
        setTransactionDetail(payload.transaction);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Gagal memuat detail transaksi.');
      } finally {
        setTransactionDetailLoading(false);
      }
    },
    [notify, session]
  );

  if (booting) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={appTheme}>
          <View style={styles.centered}>
            <ActivityIndicator animating size="large" />
            <Text variant="titleMedium" style={styles.bootText}>
              Menyiapkan POS Mobile
            </Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        {session && bootstrap ? (
          <AuthenticatedApp
            bootstrap={bootstrap}
            initializing={initializing}
            onBootstrapChange={setBootstrap}
            onLogout={handleLogout}
            onRefreshAll={refreshAll}
            onShowMessage={notify}
            onTransactionPress={openTransactionDetail}
            productSearch={productSearch}
            products={products}
            productsLoading={productsLoading}
            selectedCategory={selectedCategory}
            session={session}
            setInitializing={setInitializing}
            setProductSearch={setProductSearch}
            setSelectedCategory={setSelectedCategory}
            setTransactions={setTransactions}
            transactions={transactions}
            historyLoading={historyLoading}
            historySearch={historySearch}
            setHistorySearch={setHistorySearch}
            refreshingDashboard={refreshingDashboard}
            setApiBaseUrlDraft={setApiBaseUrlDraft}
            apiBaseUrlDraft={apiBaseUrlDraft}
          />
        ) : (
          <SignInScreen
            apiBaseUrl={apiBaseUrlDraft}
            email={email}
            loading={submittingLogin}
            onApiBaseUrlChange={setApiBaseUrlDraft}
            onEmailChange={setEmail}
            onLogin={handleLogin}
            onPasswordChange={setPassword}
            password={password}
          />
        )}

        <Portal>
          <Dialog
            dismissable={!transactionDetailLoading}
            onDismiss={() => setTransactionDetail(null)}
            visible={transactionDetailLoading || Boolean(transactionDetail)}
          >
            <Dialog.Title>Detail transaksi</Dialog.Title>
            <Dialog.Content>
              {transactionDetailLoading ? (
                <View style={styles.centered}>
                  <ActivityIndicator animating />
                </View>
              ) : transactionDetail ? (
                <ScrollView style={{ maxHeight: 420 }}>
                  <Text variant="titleMedium">{transactionDetail.invoice}</Text>
                  <Text variant="bodyMedium" style={styles.mutedText}>
                    {formatDateTime(transactionDetail.created_at)}
                  </Text>
                  <Text variant="bodyMedium" style={styles.sectionSpacing}>
                    {transactionDetail.customer?.name || 'Pelanggan umum'}
                  </Text>
                  <View style={styles.detailMetaRow}>
                    <Chip compact icon="credit-card-outline">
                      {transactionDetail.payment_method}
                    </Chip>
                    <Chip compact icon="check-decagram-outline">
                      {transactionDetail.payment_status}
                    </Chip>
                  </View>
                  <Divider style={styles.sectionSpacing} />
                  {transactionDetail.details.map((detail) => (
                    <List.Item
                      description={`${detail.qty} x ${formatCurrency(detail.product.sell_price)}`}
                      key={detail.id}
                      title={detail.product.title}
                      right={() => (
                        <Text variant="bodyMedium">{formatCurrency(detail.line_total)}</Text>
                      )}
                    />
                  ))}
                  <Divider />
                  <List.Item
                    title="Total"
                    right={() => (
                      <Text variant="titleMedium">{formatCurrency(transactionDetail.grand_total)}</Text>
                    )}
                  />
                  {!!transactionDetail.payment_url && (
                    <HelperText type="info" visible>
                      Payment link: {transactionDetail.payment_url}
                    </HelperText>
                  )}
                </ScrollView>
              ) : null}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setTransactionDetail(null)}>Tutup</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        <Snackbar
          duration={2500}
          onDismiss={() => setSnackbar((value) => ({ ...value, visible: false }))}
          visible={snackbar.visible}
        >
          {snackbar.message}
        </Snackbar>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

type SignInScreenProps = {
  apiBaseUrl: string;
  email: string;
  password: string;
  loading: boolean;
  onApiBaseUrlChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: () => void;
};

function SignInScreen({
  apiBaseUrl,
  email,
  loading,
  onApiBaseUrlChange,
  onEmailChange,
  onLogin,
  onPasswordChange,
  password,
}: SignInScreenProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.authContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Surface style={styles.authCard} elevation={1}>
        <Avatar.Icon icon="storefront-outline" size={64} style={styles.authAvatar} />
        <Text variant="headlineSmall">POS Mobile</Text>
        <Text style={styles.mutedText} variant="bodyMedium">
          Cashier app berbasis React Native Paper untuk backend Laravel POS.
        </Text>

        <TextInput
          autoCapitalize="none"
          label="API Base URL"
          mode="outlined"
          onChangeText={onApiBaseUrlChange}
          value={apiBaseUrl}
        />
        <HelperText type="info" visible>
          Contoh: https://domainmu.com/api/mobile
        </HelperText>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          mode="outlined"
          onChangeText={onEmailChange}
          value={email}
        />
        <TextInput
          label="Password"
          mode="outlined"
          onChangeText={onPasswordChange}
          secureTextEntry
          value={password}
        />

        <Button loading={loading} mode="contained" onPress={onLogin}>
          Masuk ke POS
        </Button>
      </Surface>
    </ScrollView>
  );
}

type AuthenticatedAppProps = {
  session: Session;
  bootstrap: BootstrapPayload;
  products: Product[];
  transactions: TransactionSummary[];
  productSearch: string;
  selectedCategory: number | null;
  historySearch: string;
  productsLoading: boolean;
  historyLoading: boolean;
  refreshingDashboard: boolean;
  initializing: boolean;
  apiBaseUrlDraft: string;
  setProductSearch: (value: string) => void;
  setSelectedCategory: (value: number | null) => void;
  setHistorySearch: (value: string) => void;
  setTransactions: (value: TransactionSummary[]) => void;
  setInitializing: (value: boolean) => void;
  onBootstrapChange: (value: BootstrapPayload) => void;
  onLogout: () => void;
  onRefreshAll: () => void;
  onShowMessage: (message: string) => void;
  onTransactionPress: (invoice: string) => void;
  setApiBaseUrlDraft: (value: string) => void;
};

function AuthenticatedApp({
  apiBaseUrlDraft,
  bootstrap,
  historyLoading,
  historySearch,
  initializing,
  onBootstrapChange,
  onLogout,
  onRefreshAll,
  onShowMessage,
  onTransactionPress,
  productSearch,
  products,
  productsLoading,
  refreshingDashboard,
  selectedCategory,
  session,
  setApiBaseUrlDraft,
  setHistorySearch,
  setInitializing,
  setProductSearch,
  setSelectedCategory,
  transactions,
}: AuthenticatedAppProps) {
  const [tabIndex, setTabIndex] = React.useState(0);

  const updateCartState = React.useCallback(
    (cart: CartPayload, heldCarts?: HeldCart[]) => {
      onBootstrapChange({
        ...bootstrap,
        cart,
        held_carts: heldCarts ?? bootstrap.held_carts,
      });
    },
    [bootstrap, onBootstrapChange]
  );

  const refreshBootstrapOnly = React.useCallback(async () => {
    setInitializing(true);
    try {
      const payload = await mobileRequest<BootstrapPayload>(session.baseUrl, '/bootstrap', {
        token: session.token,
      });
      onBootstrapChange(payload);
    } catch (error) {
      onShowMessage(error instanceof Error ? error.message : 'Gagal memuat data POS.');
    } finally {
      setInitializing(false);
    }
  }, [onBootstrapChange, onShowMessage, session.baseUrl, session.token, setInitializing]);

  const addProductToCart = React.useCallback(
    async (productId: number) => {
      try {
        const cart = await mobileRequest<CartPayload>(session.baseUrl, '/cart/items', {
          method: 'POST',
          token: session.token,
          body: {
            product_id: productId,
            qty: 1,
          },
        });
        updateCartState(cart);
      } catch (error) {
        onShowMessage(error instanceof Error ? error.message : 'Gagal menambahkan produk.');
      }
    },
    [onShowMessage, session.baseUrl, session.token, updateCartState]
  );

  const updateCartQty = React.useCallback(
    async (cartId: number, qty: number) => {
      if (qty < 1) {
        return;
      }

      try {
        const cart = await mobileRequest<CartPayload>(session.baseUrl, `/cart/items/${cartId}`, {
          method: 'PATCH',
          token: session.token,
          body: { qty },
        });
        updateCartState(cart);
      } catch (error) {
        onShowMessage(error instanceof Error ? error.message : 'Gagal memperbarui keranjang.');
      }
    },
    [onShowMessage, session.baseUrl, session.token, updateCartState]
  );

  const removeCartItem = React.useCallback(
    async (cartId: number) => {
      try {
        const cart = await mobileRequest<CartPayload>(session.baseUrl, `/cart/items/${cartId}`, {
          method: 'DELETE',
          token: session.token,
        });
        updateCartState(cart);
      } catch (error) {
        onShowMessage(error instanceof Error ? error.message : 'Gagal menghapus item.');
      }
    },
    [onShowMessage, session.baseUrl, session.token, updateCartState]
  );

  const holdCart = React.useCallback(
    async (label?: string) => {
      try {
        const payload = await mobileRequest<{ held_carts: HeldCart[] }>(session.baseUrl, '/cart/hold', {
          method: 'POST',
          token: session.token,
          body: { label },
        });
        updateCartState({ ...bootstrap.cart, items: [], items_count: 0, subtotal: 0 }, payload.held_carts);
        onShowMessage('Transaksi berhasil ditahan.');
      } catch (error) {
        onShowMessage(error instanceof Error ? error.message : 'Gagal menahan transaksi.');
      }
    },
    [bootstrap.cart, onShowMessage, session.baseUrl, session.token, updateCartState]
  );

  const resumeHeldCart = React.useCallback(
    async (holdId: string) => {
      try {
        const cart = await mobileRequest<CartPayload>(session.baseUrl, `/cart/held/${holdId}/resume`, {
          method: 'POST',
          token: session.token,
        });
        await refreshBootstrapOnly();
        updateCartState(cart);
        onShowMessage('Transaksi berhasil dilanjutkan.');
      } catch (error) {
        onShowMessage(error instanceof Error ? error.message : 'Gagal melanjutkan transaksi.');
      }
    },
    [onShowMessage, refreshBootstrapOnly, session.baseUrl, session.token, updateCartState]
  );

  const deleteHeldCart = React.useCallback(
    async (holdId: string) => {
      try {
        const payload = await mobileRequest<{ held_carts: HeldCart[] }>(session.baseUrl, `/cart/held/${holdId}`, {
          method: 'DELETE',
          token: session.token,
        });
        updateCartState(bootstrap.cart, payload.held_carts);
        onShowMessage('Transaksi hold dihapus.');
      } catch (error) {
        onShowMessage(error instanceof Error ? error.message : 'Gagal menghapus hold.');
      }
    },
    [bootstrap.cart, onShowMessage, session.baseUrl, session.token, updateCartState]
  );

  const createCustomer = React.useCallback(
    async (form: AddCustomerForm) => {
      const payload = await mobileRequest<{ customer: Customer }>(session.baseUrl, '/customers', {
        method: 'POST',
        token: session.token,
        body: form,
      });

      onBootstrapChange({
        ...bootstrap,
        customers: [payload.customer, ...bootstrap.customers],
      });

      return payload.customer;
    },
    [bootstrap, onBootstrapChange, session.baseUrl, session.token]
  );

  const submitCheckout = React.useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await mobileRequest<{ transaction: TransactionDetail }>(
        session.baseUrl,
        '/checkout',
        {
          method: 'POST',
          token: session.token,
          body: payload,
        }
      );

      await refreshBootstrapOnly();
      return response.transaction;
    },
    [refreshBootstrapOnly, session.baseUrl, session.token]
  );

  const routes = React.useMemo(
    () => [
      { key: 'dashboard', title: 'Ringkasan', focusedIcon: 'view-dashboard-outline' },
      { key: 'pos', title: 'Kasir', focusedIcon: 'cart-outline' },
      { key: 'history', title: 'Riwayat', focusedIcon: 'history' },
      { key: 'profile', title: 'Profil', focusedIcon: 'account-circle-outline' },
    ],
    []
  );

  const renderScene = BottomNavigation.SceneMap({
    dashboard: () => (
      <DashboardScreen
        bootstrap={bootstrap}
        loading={refreshingDashboard || initializing}
        onRefresh={onRefreshAll}
      />
    ),
    pos: () => (
      <PosScreen
        bankAccounts={bootstrap.bank_accounts}
        cart={bootstrap.cart}
        categories={bootstrap.categories}
        createCustomer={createCustomer}
        customers={bootstrap.customers}
        defaultGateway={bootstrap.default_gateway}
        heldCarts={bootstrap.held_carts}
        onAddProduct={addProductToCart}
        onDeleteHeldCart={deleteHeldCart}
        onHoldCart={holdCart}
        onRefresh={refreshBootstrapOnly}
        onRemoveCartItem={removeCartItem}
        onResumeHeldCart={resumeHeldCart}
        onShowMessage={onShowMessage}
        onSubmitCheckout={submitCheckout}
        onUpdateCartQty={updateCartQty}
        paymentGateways={bootstrap.payment_gateways}
        productSearch={productSearch}
        products={products}
        productsLoading={productsLoading || initializing}
        selectedCategory={selectedCategory}
        setProductSearch={setProductSearch}
        setSelectedCategory={setSelectedCategory}
      />
    ),
    history: () => (
      <HistoryScreen
        loading={historyLoading}
        onSearchChange={setHistorySearch}
        onTransactionPress={onTransactionPress}
        search={historySearch}
        transactions={transactions}
      />
    ),
    profile: () => (
      <ProfileScreen
        apiBaseUrl={apiBaseUrlDraft}
        onApiBaseUrlChange={setApiBaseUrlDraft}
        onLogout={onLogout}
        user={session.user}
      />
    ),
  });

  return (
    <BottomNavigation
      navigationState={{ index: tabIndex, routes }}
      onIndexChange={setTabIndex}
      renderScene={renderScene}
      sceneAnimationEnabled
    />
  );
}

function DashboardScreen({
  bootstrap,
  loading,
  onRefresh,
}: {
  bootstrap: BootstrapPayload;
  loading: boolean;
  onRefresh: () => void;
}) {
  const summaryCards = [
    {
      label: 'Produk aktif',
      value: String(bootstrap.dashboard_highlights.products),
      icon: 'package-variant-closed',
    },
    {
      label: 'Pelanggan',
      value: String(bootstrap.dashboard_highlights.customers),
      icon: 'account-multiple-outline',
    },
    {
      label: 'Transaksi',
      value: String(bootstrap.dashboard_highlights.transactions),
      icon: 'receipt-text-outline',
    },
    {
      label: 'Cart aktif',
      value: String(bootstrap.cart.items_count),
      icon: 'cart-outline',
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
    >
      <Text variant="headlineSmall">Ringkasan operasional</Text>
      <Text style={styles.mutedText} variant="bodyMedium">
        Snapshot cepat untuk kasir mobile.
      </Text>

      <View style={styles.summaryGrid}>
        {summaryCards.map((item) => (
          <Card key={item.label} mode="contained" style={styles.summaryCard}>
            <Card.Content>
              <List.Icon icon={item.icon} />
              <Text variant="headlineSmall">{item.value}</Text>
              <Text variant="bodyMedium" style={styles.mutedText}>
                {item.label}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <Card mode="contained">
        <Card.Title title="Subtotal cart aktif" subtitle="Total sebelum diskon dan ongkir" />
        <Card.Content>
          <Text variant="headlineMedium">{formatCurrency(bootstrap.cart.subtotal)}</Text>
          <Text style={styles.mutedText} variant="bodySmall">
            {bootstrap.cart.items_count} item di keranjang saat ini
          </Text>
        </Card.Content>
      </Card>

      <Card mode="contained">
        <Card.Title title="Metode pembayaran aktif" />
        <Card.Content style={styles.wrapRow}>
          <Chip icon="cash">Tunai</Chip>
          {bootstrap.payment_gateways.map((gateway) => (
            <Chip icon="credit-card-outline" key={gateway.value}>
              {gateway.label}
            </Chip>
          ))}
        </Card.Content>
      </Card>

      <Card mode="contained">
        <Card.Title title="Hold terbaru" subtitle="Transaksi yang bisa dilanjutkan lagi" />
        <Card.Content>
          {bootstrap.held_carts.length === 0 ? (
            <EmptyState
              description="Belum ada transaksi yang disimpan sementara."
              icon="archive-outline"
              title="Tidak ada hold"
            />
          ) : (
            bootstrap.held_carts.slice(0, 3).map((held) => (
              <List.Item
                description={`${held.items_count} item • ${formatCurrency(held.total)}`}
                key={held.hold_id}
                left={(props) => <List.Icon {...props} icon="archive-arrow-up-outline" />}
                title={held.label}
              />
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

type PosScreenProps = {
  categories: BootstrapPayload['categories'];
  customers: Customer[];
  products: Product[];
  cart: CartPayload;
  heldCarts: HeldCart[];
  paymentGateways: PaymentGateway[];
  defaultGateway: string;
  bankAccounts: BankAccount[];
  productSearch: string;
  selectedCategory: number | null;
  productsLoading: boolean;
  createCustomer: (form: AddCustomerForm) => Promise<Customer>;
  onAddProduct: (productId: number) => void;
  onUpdateCartQty: (cartId: number, qty: number) => void;
  onRemoveCartItem: (cartId: number) => void;
  onHoldCart: (label?: string) => void;
  onResumeHeldCart: (holdId: string) => void;
  onDeleteHeldCart: (holdId: string) => void;
  onSubmitCheckout: (payload: Record<string, unknown>) => Promise<TransactionDetail>;
  onShowMessage: (message: string) => void;
  onRefresh: () => void;
  setProductSearch: (value: string) => void;
  setSelectedCategory: (value: number | null) => void;
};

function PosScreen({
  bankAccounts,
  cart,
  categories,
  createCustomer,
  customers,
  defaultGateway,
  heldCarts,
  onAddProduct,
  onDeleteHeldCart,
  onHoldCart,
  onRefresh,
  onRemoveCartItem,
  onResumeHeldCart,
  onShowMessage,
  onSubmitCheckout,
  onUpdateCartQty,
  paymentGateways,
  productSearch,
  products,
  productsLoading,
  selectedCategory,
  setProductSearch,
  setSelectedCategory,
}: PosScreenProps) {
  const [view, setView] = React.useState<'products' | 'cart'>('products');
  const [customerPickerVisible, setCustomerPickerVisible] = React.useState(false);
  const [heldVisible, setHeldVisible] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(customers[0] ?? null);
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [discount, setDiscount] = React.useState('0');
  const [shippingCost, setShippingCost] = React.useState('0');
  const [cash, setCash] = React.useState('0');
  const [payLater, setPayLater] = React.useState(false);
  const [dueDate, setDueDate] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState(
    defaultGateway && defaultGateway !== 'cash' ? defaultGateway : 'cash'
  );
  const [selectedBankAccountId, setSelectedBankAccountId] = React.useState<number | null>(
    bankAccounts[0]?.id ?? null
  );
  const [holdLabel, setHoldLabel] = React.useState('');
  const [addCustomerVisible, setAddCustomerVisible] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [checkoutResult, setCheckoutResult] = React.useState<TransactionDetail | null>(null);
  const [customerForm, setCustomerForm] = React.useState<AddCustomerForm>({
    name: '',
    no_telp: '',
    address: '',
  });

  React.useEffect(() => {
    if (!selectedCustomer && customers.length > 0) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomer]);

  React.useEffect(() => {
    if (paymentMethod !== 'bank_transfer') {
      setSelectedBankAccountId(null);
      return;
    }

    if (!selectedBankAccountId && bankAccounts[0]) {
      setSelectedBankAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, paymentMethod, selectedBankAccountId]);

  const filteredCustomers = React.useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.no_telp.toLowerCase().includes(query)
      );
    });
  }, [customerSearch, customers]);

  const subtotal = cart.subtotal;
  const numericDiscount = Number(discount) || 0;
  const numericShipping = Number(shippingCost) || 0;
  const grandTotal = Math.max(subtotal - numericDiscount + numericShipping, 0);
  const isCashPayment = !payLater && paymentMethod === 'cash';
  const numericCash = Number(cash) || 0;
  const change = isCashPayment ? Math.max(numericCash - grandTotal, 0) : 0;

  const paymentOptions = React.useMemo(() => {
    const base = [{ value: 'cash', label: 'Tunai' }];
    return [
      ...base,
      ...paymentGateways.map((gateway) => ({
        value: gateway.value,
        label: gateway.label,
      })),
    ];
  }, [paymentGateways]);

  const resetCheckoutForm = React.useCallback(() => {
    setDiscount('0');
    setShippingCost('0');
    setCash('0');
    setPayLater(false);
    setDueDate('');
    setPaymentMethod(defaultGateway && defaultGateway !== 'cash' ? defaultGateway : 'cash');
  }, [defaultGateway]);

  const handleCheckout = React.useCallback(async () => {
    if (cart.items.length === 0) {
      onShowMessage('Keranjang masih kosong.');
      return;
    }

    if (!selectedCustomer) {
      onShowMessage('Pilih pelanggan terlebih dahulu.');
      return;
    }

    if (payLater && !dueDate) {
      onShowMessage('Isi tanggal jatuh tempo untuk nota barang.');
      return;
    }

    if (isCashPayment && numericCash < grandTotal) {
      onShowMessage('Nominal bayar masih kurang.');
      return;
    }

    if (paymentMethod === 'bank_transfer' && !selectedBankAccountId) {
      onShowMessage('Pilih rekening tujuan transfer.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const transaction = await onSubmitCheckout({
        customer_id: selectedCustomer.id,
        discount: numericDiscount,
        shipping_cost: numericShipping,
        grand_total: grandTotal,
        cash: isCashPayment ? numericCash : grandTotal,
        change,
        payment_gateway: payLater || isCashPayment ? null : paymentMethod,
        bank_account_id: paymentMethod === 'bank_transfer' ? selectedBankAccountId : null,
        pay_later: payLater,
        due_date: payLater ? dueDate : null,
      });

      setCheckoutResult(transaction);
      resetCheckoutForm();
      onRefresh();
    } catch (error) {
      onShowMessage(error instanceof Error ? error.message : 'Checkout gagal.');
    } finally {
      setCheckoutLoading(false);
    }
  }, [
    cart.items.length,
    change,
    dueDate,
    grandTotal,
    isCashPayment,
    numericCash,
    numericDiscount,
    numericShipping,
    onRefresh,
    onShowMessage,
    onSubmitCheckout,
    payLater,
    paymentMethod,
    resetCheckoutForm,
    selectedBankAccountId,
    selectedCustomer,
  ]);

  const handleCreateCustomer = React.useCallback(async () => {
    if (!customerForm.name || !customerForm.no_telp || !customerForm.address) {
      onShowMessage('Lengkapi nama, telepon, dan alamat pelanggan.');
      return;
    }

    try {
      const customer = await createCustomer(customerForm);
      setSelectedCustomer(customer);
      setCustomerForm({ name: '', no_telp: '', address: '' });
      setAddCustomerVisible(false);
      onShowMessage('Pelanggan baru berhasil ditambahkan.');
    } catch (error) {
      onShowMessage(error instanceof Error ? error.message : 'Gagal menambah pelanggan.');
    }
  }, [createCustomer, customerForm, onShowMessage]);

  return (
    <View style={styles.flexContainer}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <View style={styles.headerRow}>
          <Text variant="headlineSmall">Kasir mobile</Text>
          <View style={styles.inlineRow}>
            <IconButton icon="archive-arrow-up-outline" onPress={() => setHeldVisible(true)} />
            <IconButton icon="refresh" onPress={onRefresh} />
          </View>
        </View>

        <SegmentedButtons
          buttons={[
            { value: 'products', label: 'Produk' },
            { value: 'cart', label: `Cart (${cart.items_count})` },
          ]}
          onValueChange={(value) => setView(value as 'products' | 'cart')}
          value={view}
        />

        {view === 'products' ? (
          <>
            <Searchbar
              onChangeText={setProductSearch}
              placeholder="Cari nama, barcode, atau SKU"
              value={productSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.horizontalChips}>
                <Chip
                  icon={selectedCategory === null ? 'check' : undefined}
                  onPress={() => setSelectedCategory(null)}
                  selected={selectedCategory === null}
                >
                  Semua
                </Chip>
                {categories.map((category) => (
                  <Chip
                    icon={selectedCategory === category.id ? 'check' : undefined}
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    selected={selectedCategory === category.id}
                  >
                    {category.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>

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
                renderItem={({ item }) => (
                  <ProductCard onAdd={onAddProduct} product={item} />
                )}
                scrollEnabled={false}
              />
            )}
          </>
        ) : (
          <>
            <Card mode="contained">
              <Card.Content>
                <View style={styles.headerRow}>
                  <View>
                    <Text variant="titleMedium">Pelanggan</Text>
                    <Text style={styles.mutedText} variant="bodySmall">
                      {selectedCustomer?.name || 'Belum dipilih'}
                    </Text>
                  </View>
                  <View style={styles.inlineRow}>
                    <Button mode="outlined" onPress={() => setAddCustomerVisible(true)}>
                      Baru
                    </Button>
                    <Button mode="contained-tonal" onPress={() => setCustomerPickerVisible(true)}>
                      Pilih
                    </Button>
                  </View>
                </View>
              </Card.Content>
            </Card>

            <Card mode="contained">
              <Card.Title title="Item keranjang" />
              <Card.Content style={styles.cardContentGap}>
                {cart.items.length === 0 ? (
                  <EmptyState
                    description="Tambahkan produk dari tab produk untuk mulai transaksi."
                    icon="cart-off"
                    title="Keranjang kosong"
                  />
                ) : (
                  cart.items.map((item) => (
                    <CartItemRow
                      item={item}
                      key={item.id}
                      onDecrease={() => onUpdateCartQty(item.id, item.qty - 1)}
                      onIncrease={() => onUpdateCartQty(item.id, item.qty + 1)}
                      onRemove={() => onRemoveCartItem(item.id)}
                    />
                  ))
                )}
              </Card.Content>
            </Card>

            <Card mode="contained">
              <Card.Title title="Pembayaran" />
              <Card.Content style={styles.cardContentGap}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall">Nota barang / pay later</Text>
                    <Text variant="bodySmall" style={styles.mutedText}>
                      Aktifkan untuk piutang pelanggan.
                    </Text>
                  </View>
                  <Switch value={payLater} onValueChange={setPayLater} />
                </View>

                <TextInput
                  disabled={payLater}
                  keyboardType="number-pad"
                  label="Diskon"
                  mode="outlined"
                  onChangeText={setDiscount}
                  value={discount}
                />
                <TextInput
                  keyboardType="number-pad"
                  label="Ongkir"
                  mode="outlined"
                  onChangeText={setShippingCost}
                  value={shippingCost}
                />

                {!payLater ? (
                  <>
                    <SegmentedButtons
                      buttons={paymentOptions}
                      onValueChange={setPaymentMethod}
                      value={paymentMethod}
                    />

                    {paymentMethod === 'bank_transfer' && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.horizontalChips}>
                          {bankAccounts.map((account) => (
                            <Chip
                              icon={
                                selectedBankAccountId === account.id ? 'check-circle-outline' : 'bank-outline'
                              }
                              key={account.id}
                              onPress={() => setSelectedBankAccountId(account.id)}
                              selected={selectedBankAccountId === account.id}
                            >
                              {account.bank_name}
                            </Chip>
                          ))}
                        </View>
                      </ScrollView>
                    )}

                    {isCashPayment && (
                      <TextInput
                        keyboardType="number-pad"
                        label="Nominal bayar"
                        mode="outlined"
                        onChangeText={setCash}
                        value={cash}
                      />
                    )}
                  </>
                ) : (
                  <TextInput
                    label="Jatuh tempo (YYYY-MM-DD)"
                    mode="outlined"
                    onChangeText={setDueDate}
                    value={dueDate}
                  />
                )}

                <Surface mode="flat" style={styles.totalBox}>
                  <List.Item
                    description="Sebelum diskon dan ongkir"
                    left={(props) => <List.Icon {...props} icon="calculator-variant-outline" />}
                    right={() => <Text variant="bodyLarge">{formatCurrency(subtotal)}</Text>}
                    title="Subtotal"
                  />
                  <List.Item
                    description="Diskon dan pengiriman"
                    left={(props) => <List.Icon {...props} icon="tag-outline" />}
                    right={() => <Text variant="bodyLarge">{formatCurrency(grandTotal)}</Text>}
                    title="Total bayar"
                  />
                  {isCashPayment && (
                    <List.Item
                      description="Kembalian"
                      left={(props) => <List.Icon {...props} icon="cash-refund" />}
                      right={() => <Text variant="bodyLarge">{formatCurrency(change)}</Text>}
                      title="Change"
                    />
                  )}
                </Surface>

                <View style={styles.buttonRow}>
                  <Button mode="outlined" onPress={() => onHoldCart(holdLabel || undefined)}>
                    Hold
                  </Button>
                  <Button loading={checkoutLoading} mode="contained" onPress={handleCheckout}>
                    Checkout
                  </Button>
                </View>
                <TextInput
                  label="Label hold (opsional)"
                  mode="outlined"
                  onChangeText={setHoldLabel}
                  value={holdLabel}
                />
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>

      <Portal>
        <Modal
          contentContainerStyle={styles.modalCard}
          onDismiss={() => setCustomerPickerVisible(false)}
          visible={customerPickerVisible}
        >
          <Text variant="titleLarge">Pilih pelanggan</Text>
          <Searchbar
            onChangeText={setCustomerSearch}
            placeholder="Cari nama atau telepon"
            value={customerSearch}
          />
          <ScrollView style={{ maxHeight: 320 }}>
            {filteredCustomers.map((customer) => (
              <List.Item
                description={customer.no_telp}
                key={customer.id}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={selectedCustomer?.id === customer.id ? 'check-circle' : 'account-circle-outline'}
                  />
                )}
                onPress={() => {
                  setSelectedCustomer(customer);
                  setCustomerPickerVisible(false);
                }}
                title={customer.name}
              />
            ))}
          </ScrollView>
        </Modal>

        <Dialog onDismiss={() => setAddCustomerVisible(false)} visible={addCustomerVisible}>
          <Dialog.Title>Pelanggan baru</Dialog.Title>
          <Dialog.Content style={styles.cardContentGap}>
            <TextInput
              label="Nama"
              mode="outlined"
              onChangeText={(value) => setCustomerForm((form) => ({ ...form, name: value }))}
              value={customerForm.name}
            />
            <TextInput
              keyboardType="phone-pad"
              label="No. telepon"
              mode="outlined"
              onChangeText={(value) => setCustomerForm((form) => ({ ...form, no_telp: value }))}
              value={customerForm.no_telp}
            />
            <TextInput
              label="Alamat"
              mode="outlined"
              multiline
              numberOfLines={3}
              onChangeText={(value) => setCustomerForm((form) => ({ ...form, address: value }))}
              value={customerForm.address}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddCustomerVisible(false)}>Batal</Button>
            <Button onPress={handleCreateCustomer}>Simpan</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog onDismiss={() => setHeldVisible(false)} visible={heldVisible}>
          <Dialog.Title>Transaksi hold</Dialog.Title>
          <Dialog.Content>
            {heldCarts.length === 0 ? (
              <EmptyState
                description="Belum ada transaksi yang ditahan."
                icon="archive-off-outline"
                title="Kosong"
              />
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {heldCarts.map((held) => (
                  <Card key={held.hold_id} mode="contained" style={styles.heldCard}>
                    <Card.Content style={styles.cardContentGap}>
                      <Text variant="titleMedium">{held.label}</Text>
                      <Text style={styles.mutedText} variant="bodySmall">
                        {held.items_count} item • {formatCurrency(held.total)}
                      </Text>
                      <View style={styles.buttonRow}>
                        <Button mode="contained-tonal" onPress={() => onResumeHeldCart(held.hold_id)}>
                          Resume
                        </Button>
                        <Button mode="text" onPress={() => onDeleteHeldCart(held.hold_id)}>
                          Hapus
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setHeldVisible(false)}>Tutup</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog onDismiss={() => setCheckoutResult(null)} visible={Boolean(checkoutResult)}>
          <Dialog.Title>Checkout berhasil</Dialog.Title>
          <Dialog.Content>
            {checkoutResult && (
              <View style={styles.cardContentGap}>
                <Text variant="titleMedium">{checkoutResult.invoice}</Text>
                <Text variant="bodyMedium">{formatCurrency(checkoutResult.grand_total)}</Text>
                <Text style={styles.mutedText} variant="bodySmall">
                  Status: {checkoutResult.payment_status}
                </Text>
                {!!checkoutResult.payment_url && (
                  <HelperText type="info" visible>
                    Payment link tersedia dan siap dibagikan.
                  </HelperText>
                )}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCheckoutResult(null)}>Siap</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function HistoryScreen({
  loading,
  onSearchChange,
  onTransactionPress,
  search,
  transactions,
}: {
  transactions: TransactionSummary[];
  search: string;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onTransactionPress: (invoice: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text variant="headlineSmall">Riwayat transaksi</Text>
      <Searchbar
        onChangeText={onSearchChange}
        placeholder="Cari invoice"
        value={search}
      />
      {loading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator animating />
        </View>
      ) : transactions.length === 0 ? (
        <EmptyState
          description="Belum ada transaksi yang cocok dengan filter."
          icon="receipt-text-remove-outline"
          title="Riwayat kosong"
        />
      ) : (
        transactions.map((transaction) => (
          <Card key={transaction.id} mode="contained" onPress={() => onTransactionPress(transaction.invoice)}>
            <Card.Content style={styles.cardContentGap}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium">{transaction.invoice}</Text>
                  <Text style={styles.mutedText} variant="bodySmall">
                    {transaction.customer_name || 'Pelanggan umum'}
                  </Text>
                </View>
                <Text variant="titleSmall">{formatCurrency(transaction.grand_total)}</Text>
              </View>
              <View style={styles.wrapRow}>
                <Chip compact icon="credit-card-outline">
                  {transaction.payment_method}
                </Chip>
                <Chip compact icon="check-outline">
                  {transaction.payment_status}
                </Chip>
              </View>
              <Text style={styles.mutedText} variant="bodySmall">
                {formatDateTime(transaction.created_at)}
              </Text>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function ProfileScreen({
  apiBaseUrl,
  onApiBaseUrlChange,
  onLogout,
  user,
}: {
  user: User;
  apiBaseUrl: string;
  onApiBaseUrlChange: (value: string) => void;
  onLogout: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Card mode="contained">
        <Card.Content style={styles.cardContentGap}>
          <Avatar.Text label={user.name.slice(0, 2).toUpperCase()} size={64} />
          <Text variant="headlineSmall">{user.name}</Text>
          <Text variant="bodyMedium" style={styles.mutedText}>
            {user.email}
          </Text>
          <View style={styles.wrapRow}>
            {user.roles.map((role) => (
              <Chip key={role}>{role}</Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card mode="contained">
        <Card.Title title="Koneksi backend" />
        <Card.Content style={styles.cardContentGap}>
          <TextInput
            label="API Base URL"
            mode="outlined"
            onChangeText={onApiBaseUrlChange}
            value={apiBaseUrl}
          />
          <HelperText type="info" visible>
            Ubah URL ini bila backend Laravel berjalan di host yang berbeda.
          </HelperText>
        </Card.Content>
      </Card>

      <Button icon="logout" mode="contained" onPress={onLogout}>
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authAvatar: {
    alignSelf: 'center',
  },
  authCard: {
    borderRadius: 20,
    gap: 12,
    padding: 24,
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  bootText: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  cardContentGap: {
    gap: 12,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  detailMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  flexContainer: {
    flex: 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heldCard: {
    marginBottom: 12,
  },
  horizontalChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  inlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    gap: 12,
    margin: 20,
    padding: 20,
  },
  mutedText: {
    opacity: 0.72,
  },
  productGrid: {
    gap: 12,
    justifyContent: 'space-between',
  },
  productList: {
    gap: 12,
  },
  screenContent: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  sectionSpacing: {
    marginTop: 12,
  },
  summaryCard: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  totalBox: {
    borderRadius: 16,
    paddingVertical: 8,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
