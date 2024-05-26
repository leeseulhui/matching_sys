import { Provider } from "react-redux"; // 리덕스
import store from "./src/reduxContainer/store/store"; // 리덕스
import StackContainer from './src/components/navigations';

function App() {
  return (
    <Provider store={store}>
    <StackContainer/>
    </Provider>
  );
}

export default App;
