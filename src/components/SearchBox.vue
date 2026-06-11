<!--
  SearchBox.vue — 居中搜索框 + 毛玻璃搜索结果下拉
  - 支持历史记录展示（最多 5 条，FIFO）
  - 毛玻璃 + 半透明背景
  - 响应式宽度
-->
<template>
  <div class="search-wrapper">
    <div class="search-input-wrapper">
      <button
        class="search-btn search-btn--search"
        title="搜索"
        @click="onSearchClick"
      >
        <svg class="search-icon-svg" viewBox="0 0 1024 1024" width="24" height="24"><path d="M446.112323 177.545051c137.567677 0.219798 252.612525 104.59798 266.162424 241.493333 13.562828 136.895354-78.778182 261.818182-213.617777 289.008485-134.852525 27.203232-268.386263-52.156768-308.945455-183.608889s25.018182-272.252121 151.738182-325.779394A267.235556 267.235556 0 0 1 446.112323 177.545051m0-62.060607c-182.794343 0-330.989899 148.195556-330.989899 330.989899s148.195556 330.989899 330.989899 330.989899 330.989899-148.195556 330.989899-330.989899-148.195556-330.989899-330.989899-330.989899z m431.321212 793.341415a30.849293 30.849293 0 0 1-21.94101-9.102223l-157.220202-157.220202c-11.752727-12.179394-11.584646-31.534545 0.37495-43.50707 11.972525-11.972525 31.327677-12.140606 43.494141-0.37495l157.220202 157.220202a31.036768 31.036768 0 0 1 6.723232 33.810101 31.004444 31.004444 0 0 1-28.651313 19.174142z" fill="#fff" opacity="0.9" /></svg>
      </button>
      <input
        ref="searchInput"
        v-model="query"
        type="search"
        class="search-input"
        placeholder="请输入城市名称"
        autocomplete="off"
        @input="onInput"
        @focus="onFocus"
        @click="onInputClick"
        @keydown.enter="onSearchClick"
        @keydown.escape="onClearClick"
        @blur="onBlur"
      />
      <button
        v-if="query"
        class="search-btn search-btn--clear"
        title="清空"
        @click="onClearClick"
      >
        ✕
      </button>
    </div>

    <!-- 搜索结果 / 历史记录 下拉 -->
    <div
      v-if="searchStore.isOpen"
      class="search-dropdown"
    >
      <!-- 无搜索词 → 展示历史记录 -->
      <template v-if="!query.trim() && searchStore.hasHistory">
        <div class="section-title">最近搜索</div>
        <div
          v-for="item in searchStore.history"
          :key="item.adcode"
          class="search-result-item"
          @click="onSelectResult(item.adcode, item.name, item.parentName, item.provinceName, item.level)"
        >
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.parentName" class="item-parent">—— {{ item.parentName }}</span>
          <button
            class="item-delete"
            @click.stop="searchStore.removeHistoryEntry(item.adcode)"
            title="删除此记录"
          >
            ×
          </button>
        </div>
        <button class="clear-history" @click="searchStore.clearHistory()">
          清空历史记录
        </button>
        <hr v-if="searchStore.hasResults" />
      </template>

      <!-- 搜索结果列表 -->
      <template v-if="searchStore.hasResults">
        <div
          v-for="(result, index) in searchStore.results"
          :key="index"
        >
          <button
            class="search-result-item"
            @click="onSelectResult(result.adcode, result.name, result.parentName, result.provinceName, result.level)"
          >
            {{ result.name }}<template v-if="result.parentName">——{{ result.parentName }}</template>
          </button>
          <hr v-if="index < searchStore.results.length - 1" />
        </div>
      </template>

      <!-- 无结果提示 -->
      <template v-if="!searchStore.hasResults && query.trim()">
        <div class="no-results">
          不存在你输入的城市，请查阅后再输入
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSearchStore } from '@/stores'
import { debounce } from '@/utils/debounce'
import { DEBOUNCE_DELAY } from '@/utils/constants'

const emit = defineEmits<{
  select: [adcode: string, name: string, parentName: string, provinceName: string, level: string]
}>()

const searchStore = useSearchStore()
const searchInput = ref<HTMLInputElement | null>(null)

const query = ref('')

/** 防抖自动搜索（输入时延迟触发） */
const debouncedSearch = debounce((q: string) => {
  if (q.trim()) {
    searchStore.performSearch(q)
  }
}, DEBOUNCE_DELAY)

function onInput(): void {
  searchStore.setQuery(query.value)
  // 有输入内容时启动防抖搜索，空内容关闭弹窗
  if (query.value.trim()) {
    debouncedSearch(query.value)
  } else {
    debouncedSearch.cancel()
    searchStore.closeDialog()
  }
}

function onFocus(): void {
  if (!query.value.trim() && searchStore.hasHistory) {
    searchStore.isOpen = true
  }
}

function onInputClick(): void {
  if (query.value.trim()) {
    searchStore.isOpen = !searchStore.isOpen
  } else if (searchStore.hasHistory) {
    searchStore.isOpen = true
  }
}

function onSearchClick(): void {
  // 按钮或回车：立即打断防抖，直接执行搜索
  debouncedSearch.cancel()
  if (query.value.trim()) {
    searchStore.performSearch(query.value)
  }
}

function onClearClick(): void {
  debouncedSearch.cancel()
  query.value = ''
  searchStore.setQuery('')
  searchStore.closeDialog()
  searchInput.value?.focus()
}

function onSelectResult(adcode: string, name: string, parentName: string, provinceName?: string, level?: string): void {
  debouncedSearch.cancel()
  searchStore.selectResult(adcode, name, parentName, provinceName, level)
  query.value = ''
  emit('select', adcode, name, parentName, provinceName || '', level || '')
}

function onBlur(): void {
  setTimeout(() => {
    searchStore.closeDialog()
  }, 150)
}
</script>

<style scoped lang="less">
.search-wrapper {
  position: relative;
  .flex-center();
  width: 100%;
  padding: 0.5rem 0 1rem;
  z-index: 100;

  .search-input-wrapper {
    position: relative;
    .flex-center();
    .responsive-width(1100px, 85%, 90%);
  }

  // SVG 图标
  .search-icon-svg {
    display: block;
    color: inherit;
  }

  // 输入框内按钮（绝对定位）
  .search-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
    padding: 0.25rem;
    z-index: 6;
    color: rgba(255, 255, 255, 0.7);
    transition: color 0.15s;

    &:hover {
      color: @font_color;
    }

    &--search {
      left: 0.75rem;
      padding: 0.35rem;
      color: rgba(255, 255, 255, 0.8);
      transition: transform 0.2s ease;

      &:hover {
        transform: translateY(-50%) scale(1.2);
      }
    }

    &--clear {
      right: 0.75rem;
    }
  }

  .search-input {
    width: 100%;
    font-size: clamp(1.15rem, 2.75vw, 1.75rem);
    border-radius: @border_radius_comset;
    border: 2px solid rgba(255, 255, 255, 0.5);
    background: rgba(80, 80, 80, 0.5);
    color: @font_color;
    padding: 1rem 4rem;
    outline: none;
    transition: background-color 0.2s, border-color 0.2s;
    z-index: 5;

    &::placeholder {
      color: rgba(255, 255, 255, 0.85);
    }

    &:focus {
      background: rgba(80, 80, 80, 0.6);
      border-color: rgba(255, 255, 255, 0.8);
    }

    &:hover {
      cursor: pointer;
    }

    // 清除搜索框默认样式
    &::-webkit-search-cancel-button {
      -webkit-appearance: none;
    }
  }

  .search-dropdown {
    position: absolute;
    top: calc(100% + @spacing_xs);
    // Match input width
    .responsive-width(1200px, 85%, 92%);
    max-height: @search_dialog_max_height;
    overflow-y: auto;
    z-index: 100;

    .frosted-glass();
    border: 1px solid @frosted_border;
    border-radius: @border_radius_lg;
    box-shadow: @shadow_frosted;
    padding: @spacing_sm 0;
    color: @text_dark;

    .section-title {
      padding: @spacing_sm @spacing_md;
      font-size: 0.85rem;
      color: @text_muted;
      font-weight: 600;
    }

    .search-result-item {
      width: 100%;
      background: transparent;
      border: none;
      text-align: left;
      padding: 10px @spacing_md;
      cursor: pointer;
      font-size: 0.95rem;
      color: @text_dark;
      display: flex;
      align-items: center;
      transition: @transition_hover;

      .item-name {
        font-weight: 600;
      }

      .item-parent {
        margin-left: @spacing_xs;
        font-size: 0.85rem;
        opacity: 0.7;
      }

      .item-delete {
        margin-left: auto;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        color: @text_muted;
        padding: 0 @spacing_xs;
        line-height: 1;
        transition: color 0.15s;

        &:hover {
          color: #e74c3c;
        }
      }

      &:hover {
        background-color: @frosted_hover;
      }
    }

    .clear-history {
      width: 100%;
      background: transparent;
      border: none;
      text-align: center;
      padding: @spacing_sm;
      cursor: pointer;
      font-size: 1rem;
      color: @text_muted;
      transition: color 0.15s;

      &:hover {
        color: #ff2d2d;
      }
    }

    .no-results {
      padding: 2rem @spacing_md;
      text-align: center;
      font-size: 1rem;
      color: @text_muted;
    }

    hr {
      margin: @spacing_xs @spacing_md;
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      width: calc(100% - 2 * @spacing_md);
    }
  }
}
</style>
