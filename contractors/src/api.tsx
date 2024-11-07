import axios, { AxiosInstance } from 'axios';

class ApiClient {

  private client: AxiosInstance

  constructor() {
    Object.keys(import.meta.env).forEach(key => {
          console.log(`${key}: ${import.meta.env[key]}`);
      });
    this.client = axios.create({
        baseURL: import.meta.env.VITE_API_HOST || 'http://localhost:3000/',
      });
  }

  contractors = (params?:Record<string, any>) => this.client.get('/contractors', params)
  statuses = () => this.client.get('/statuses')
  cities = () => this.client.get('/cities')
}

const api = new ApiClient()

export default api