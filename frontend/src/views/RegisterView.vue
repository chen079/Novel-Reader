<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
      <h1 class="text-2xl font-bold text-center mb-8 dark:text-white">注册</h1>
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <input
            v-model="username"
            type="text"
            placeholder="用户名 (2-20个字符)"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div>
          <input
            v-model="email"
            type="email"
            placeholder="邮箱"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div>
          <input
            v-model="password"
            type="password"
            placeholder="密码 (至少6个字符)"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div v-if="error" class="text-red-500 text-sm text-center">{{ error }}</div>
        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {{ submitting ? '注册中...' : '注册' }}
        </button>
      </form>
      <p class="text-center mt-6 text-gray-500 dark:text-gray-400 text-sm">
        已有账号？
        <router-link to="/login" class="text-primary font-semibold">登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleRegister() {
  error.value = ''
  submitting.value = true
  try {
    await userStore.register(username.value, email.value, password.value)
    router.push('/')
  } catch (e) {
    const detail = e.response?.data?.detail
    if (Array.isArray(detail)) {
      error.value = detail.map(d => d.msg).join('; ')
    } else {
      error.value = detail || '注册失败'
    }
  } finally {
    submitting.value = false
  }
}
</script>
