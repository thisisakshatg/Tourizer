import { showAlert } from './alerts';
import axios from 'axios';

export const signup = async data => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      data: data
    });
    if (res.data.status === 'success') showAlert('success', 'ACCOUNT CREATED SUCCESSFULLY!!');
    window.setTimeout(() => {
      location.assign('/');
    }, 1500);
  } catch (err) {
    if (err.response.data.message.startsWith('E11000'))
      showAlert('error', 'User already exists. Please use another email!');
    else showAlert('error', err.response.data.message);
  }
};
