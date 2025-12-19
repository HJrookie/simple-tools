import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import "ant-design-vue/dist/reset.css";
import Antd from 'ant-design-vue';

// import {
//   Tag,
//   Tooltip,
//   Modal,
//   Checkbox,
//   Row,
//   Radio,
//   Input,
//   UploadDragger,
//   Slider,
//   Textarea,
//   Switch,
//   InputNumber,
//   Col,
//   FormItem,
//   Tabs,
//   Divider,
//   TabPane,
//   Form,
//   notification,
//   Result,
//   Button,
//   Card,
//   Alert,
//   Table,
//   InputSearch,
//   Progress,
//   Menu,
//   Dropdown,
//   Upload,
// } from "ant-design-vue";
import router from "./router";

const app = createApp(App);

app.use(router);

// app.use(Tag);

// app.use(Tooltip);
// app.use(Button);
// app.use(Card);
// app.use(Alert);
// app.use(UploadDragger);
// app.use(Upload);
// app.use(FormItem);
// app.use(Form);
// app.use(Menu);
// app.use(Dropdown);
// app.use(Table);
// app.use(Switch);
// app.use(Textarea);
// app.use(InputSearch);
// app.use(Radio);

// app.use(Progress);
// app.use(InputNumber);
// app.use(Tabs);
// app.use(Input);
// app.use(Slider);
// app.use(TabPane);
// app.use(Divider);
// app.use(Row);
// app.use(Col);
// app.use(Result);
// app.use(Modal);
// app.use(notification);
// app.use(Checkbox);
app.use(Antd);
app.mount("#app");
