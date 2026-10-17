import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import {
  X,
  Search,
  Plus,
  Check,
  Smartphone,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Clapperboard,
  Tv,
  Gamepad2,
  ShoppingBag,
  MessageCircle,
  Camera,
  Pin,
  Send,
  Hash,
  Phone,
  PlaySquare,
  Music,
  Film,
  Flame,
  Crosshair,
  Swords,
  Box,
  ShoppingCart,
  Store,
  Gift,
} from 'lucide-react-native';
import {
  PRESET_APP_CATALOG,
  APP_CATEGORIES,
  CatalogApp,
  AppCategory,
} from '../data/appCatalog';
import { RestrictedApp } from '../store/useAppStore';
import { ThemeColors } from '../theme/colors';
import { screenTimeService } from '../services/ScreenTimeService';
import { hapticService } from '../utils/haptics';

interface AddAppModalProps {
  visible: boolean;
  onClose: () => void;
  onAddApp: (app: CatalogApp | { name: string; category?: string; icon?: string; color?: string }) => void;
  restrictedApps: RestrictedApp[];
  colors: ThemeColors;
}

export const AddAppModal: React.FC<AddAppModalProps> = ({
  visible,
  onClose,
  onAddApp,
  restrictedApps,
  colors,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | 'all'>('all');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<AppCategory>('other');

  // Chuẩn hóa chuỗi tìm kiếm (loại bỏ dấu tiếng Việt và chữ hoa để người dùng tìm dễ dàng không lo sai chính tả)
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  };

  const filteredApps = useMemo(() => {
    const q = normalize(searchQuery.trim());
    return PRESET_APP_CATALOG.filter((app) => {
      const matchCategory =
        selectedCategory === 'all' || app.category === selectedCategory;
      if (!matchCategory) return false;
      if (!q) return true;

      const normName = normalize(app.name);
      const normCat = normalize(app.categoryName);
      const normDesc = normalize(app.description);
      const normId = normalize(app.id);

      return (
        normName.includes(q) ||
        normCat.includes(q) ||
        normDesc.includes(q) ||
        normId.includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  const isAppAlreadyAdded = (appId: string, appName: string) => {
    return restrictedApps.some(
      (a) => a.id === appId || a.name.toLowerCase() === appName.toLowerCase()
    );
  };

  const handleSelectApp = (app: CatalogApp) => {
    onAddApp(app);
    hapticService.success();
  };

  const handleAddCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) {
      Alert.alert('Chưa nhập tên', 'Vui lòng nhập tên ứng dụng bạn muốn theo dõi.');
      return;
    }
    // Tự động chuẩn hóa viết hoa chữ cái đầu cho đẹp và chuẩn
    const formattedName = trimmed
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    onAddApp({
      name: formattedName,
      category: customCategory,
      icon: 'smartphone',
      color: '#6366F1',
    });
    setCustomName('');
    setShowCustomInput(false);
    hapticService.success();
  };

  const handleOpenNativePicker = async () => {
    const res = await screenTimeService.presentNativeFamilyActivityPicker();
    if (res && res.apps.length > 0) {
      Alert.alert('Thành công', `Đã chọn ${res.apps.length} ứng dụng từ Screen Time iOS!`);
      onClose();
    } else {
      Alert.alert(
        'Screen Time iOS',
        'Tính năng chọn ứng dụng qua Apple FamilyControls khả dụng khi ứng dụng được build với Profile Family Controls trên iOS.'
      );
    }
  };

  const renderAppIcon = (iconName: string, color: string) => {
    const size = 20;
    switch (iconName) {
      case 'clapperboard': return <Clapperboard size={size} color={color} />;
      case 'tv': return <Tv size={size} color={color} />;
      case 'gamepad-2': return <Gamepad2 size={size} color={color} />;
      case 'shopping-bag': return <ShoppingBag size={size} color={color} />;
      case 'message-circle': return <MessageCircle size={size} color={color} />;
      case 'camera': return <Camera size={size} color={color} />;
      case 'pin': return <Pin size={size} color={color} />;
      case 'send': return <Send size={size} color={color} />;
      case 'hash': return <Hash size={size} color={color} />;
      case 'phone': return <Phone size={size} color={color} />;
      case 'play-square': return <PlaySquare size={size} color={color} />;
      case 'music': return <Music size={size} color={color} />;
      case 'film': return <Film size={size} color={color} />;
      case 'flame': return <Flame size={size} color={color} />;
      case 'crosshair': return <Crosshair size={size} color={color} />;
      case 'swords': return <Swords size={size} color={color} />;
      case 'box': return <Box size={size} color={color} />;
      case 'shopping-cart': return <ShoppingCart size={size} color={color} />;
      case 'store': return <Store size={size} color={color} />;
      case 'gift': return <Gift size={size} color={color} />;
      default: return <Smartphone size={size} color={color} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.cardBorder }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Thêm Ứng Dụng Khóa & Giám Sát</Text>
              <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
                Chọn từ danh mục chuẩn để tránh sai tên & theo dõi Screen Time
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.textSubtle} />
            </TouchableOpacity>
          </View>

          {/* Search Box (Tự động lọc tức thì, không phân biệt hoa thường) */}
          <View style={[styles.searchBox, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
            <Search size={18} color={colors.textSubtle} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Tìm nhanh app (TikTok, Facebook, Liên Quân, Shopee...)"
              placeholderTextColor={colors.textSubtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.textSubtle} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Chips Filter */}
          <View style={styles.categoriesWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {APP_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
                      isActive && [styles.categoryChipActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }],
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      hapticService.light();
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: colors.textSubtle },
                        isActive && [styles.categoryChipTextActive, { color: colors.primary }],
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* iOS FamilyActivityPicker CTA Button */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.nativePickerBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
              onPress={handleOpenNativePicker}
            >
              <Shield size={16} color={colors.primary} />
              <Text style={[styles.nativePickerText, { color: colors.text }]}>
                Chọn trực tiếp từ ứng dụng máy (Screen Time iOS)
              </Text>
            </TouchableOpacity>
          )}

          {/* Apps Catalog List */}
          <ScrollView
            style={styles.appListScroll}
            contentContainerStyle={styles.appListContent}
            keyboardShouldPersistTaps="handled"
          >
            {filteredApps.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Smartphone size={36} color={colors.textSubtle} />
                <Text style={[styles.emptyText, { color: colors.textSubtle }]}>
                  Không tìm thấy app nào phù hợp với từ khóa "{searchQuery}".
                </Text>
                <TouchableOpacity
                  style={[styles.addCustomPromptBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}
                  onPress={() => {
                    setShowCustomInput(true);
                    setCustomName(searchQuery);
                  }}
                >
                  <Plus size={14} color={colors.primary} />
                  <Text style={[styles.addCustomPromptText, { color: colors.primary }]}>
                    Thêm "{searchQuery}" dạng app tùy chỉnh
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredApps.map((app) => {
                const alreadyAdded = isAppAlreadyAdded(app.id, app.name);

                return (
                  <View
                    key={app.id}
                    style={[
                      styles.appCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                      alreadyAdded && [styles.appCardAdded, { backgroundColor: colors.bgSubtle }],
                    ]}
                  >
                    <View style={styles.appCardLeft}>
                      <View style={[styles.appIconWrap, { backgroundColor: app.color + '18' }]}>
                        {renderAppIcon(app.iconName, app.color)}
                      </View>
                      <View style={styles.appInfoCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.appCardName, { color: colors.text }]}>
                            {app.name}
                          </Text>
                          <View style={[styles.catBadge, { backgroundColor: colors.bgSubtle }]}>
                            <Text style={[styles.catBadgeText, { color: colors.textSubtle }]}>
                              {app.categoryName}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.appCardDesc, { color: colors.textSubtle }]}>
                          {app.description}
                        </Text>
                      </View>
                    </View>

                    {alreadyAdded ? (
                      <View style={[styles.addedBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
                        <Check size={12} color={colors.primary} />
                        <Text style={[styles.addedBadgeText, { color: colors.primary }]}>Đã theo dõi</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleSelectApp(app)}
                      >
                        <Plus size={14} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>Khóa</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}

            {/* Custom App Addition Collapsible Box */}
            <View style={[styles.customBoxWrapper, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={styles.customBoxHeader}
                onPress={() => setShowCustomInput(!showCustomInput)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <SlidersHorizontal size={16} color={colors.primary} />
                  <Text style={[styles.customBoxTitle, { color: colors.text }]}>
                    Thêm ứng dụng khác ngoài danh sách
                  </Text>
                </View>
                {showCustomInput ? (
                  <ChevronUp size={18} color={colors.textSubtle} />
                ) : (
                  <ChevronDown size={18} color={colors.textSubtle} />
                )}
              </TouchableOpacity>

              {showCustomInput && (
                <View style={styles.customInputBody}>
                  <Text style={[styles.customInputDesc, { color: colors.textSubtle }]}>
                    Nhập tên ứng dụng bạn muốn khóa (tự động chuẩn hóa chữ cái):
                  </Text>
                  <TextInput
                    style={[styles.customTextInput, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
                    placeholder="Ví dụ: Shopee, Tinder, Netflix..."
                    placeholderTextColor={colors.textSubtle}
                    value={customName}
                    onChangeText={setCustomName}
                  />

                  <TouchableOpacity
                    style={[styles.customSubmitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddCustom}
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={styles.customSubmitText}>Thêm Vào Danh Sách Khóa</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  categoriesWrapper: {
    marginBottom: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipActive: {
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    fontWeight: '800',
  },
  nativePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  nativePickerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  appListScroll: {
    flexGrow: 0,
    paddingHorizontal: 16,
  },
  appListContent: {
    paddingBottom: 30,
    gap: 8,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  appCardAdded: {
    opacity: 0.85,
  },
  appCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfoCol: {
    flex: 1,
  },
  appCardName: {
    fontSize: 14,
    fontWeight: '800',
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  appCardDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  addedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  addCustomPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  addCustomPromptText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customBoxWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    overflow: 'hidden',
  },
  customBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  customBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  customInputBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  customInputDesc: {
    fontSize: 11,
  },
  customTextInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  customSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
  },
  customSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

