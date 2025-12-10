import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import "ant-design-vue/dist/reset.css";
import { Tag, Tooltip, Modal, Tabs, TabPane, notification, Result, Button, Card, Alert, InputSearch, Progress } from "ant-design-vue";
import router from './router'


const app = createApp(App);

app.use(router)


app.use(Tag);
app.use(Tooltip);
app.use(Button);
app.use(Card);
app.use(Alert);
app.use(InputSearch);
app.use(Progress);
app.use(Tabs);
app.use(TabPane);
app.use(Result);
app.use(Modal);
app.use(notification);

app.mount("#app");
