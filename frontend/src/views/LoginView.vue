<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
      <h1 class="text-2xl font-bold text-center mb-8 dark:text-white">登录</h1>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <input
            v-model="username"
            type="text"
            placeholder="用户名"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div>
          <input
            v-model="password"
            type="password"
            placeholder="密码"
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
          {{ submitting ? '登录中...' : '登录' }}
        </button>
      </form>
      <p class="text-center mt-6 text-gray-500 dark:text-gray-400 text-sm">
        还没有账号？
        <router-link to="/register" class="text-primary font-semibold">注册</router-link>
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
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleLogin() {
  error.value = ''
  submitting.value = true
  try {
    await userStore.login(username.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.detail || '登录失败'
  } finally {
    submitting.value = false
  }
}
</script>
