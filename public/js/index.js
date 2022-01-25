import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import { showAlert } from './alerts';
import { signup } from './signup';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.querySelector('.nav__el--logout');
const userForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-settings');
const bookBtn = document.getElementById('book-tour');
const signupForm = document.getElementById('signup-form');

// DELEGATON
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm)
  loginForm.addEventListener('submit', e => {
    console.log('Inside login function!!');
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });

if (logoutBtn) logoutBtn.addEventListener('click', logout);

if (signupForm) {
  signupForm.addEventListener('submit', async e => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;

    await signup({ name, email, password, passwordConfirm });
  });
}

if (userForm)
  userForm.addEventListener('submit', async e => {
    e.preventDefault();
    console.log('Inside signup function!!');

    document.getElementById('userFormBtn').textContent = 'Updating...';
    const form = new FormData();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    form.append('name', name);
    form.append('email', email);
    form.append('photo', document.getElementById('photo').files[0]);

    await updateSettings(form, 'data');
    document.getElementById('userFormBtn').textContent = 'Save Settings';
  });

if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async e => {
    console.log('Inside signup function!!');

    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings({ passwordCurrent, password, passwordConfirm }, 'password');

    document.querySelector('.btn--save-password').textContent = 'Save Password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });

if (bookBtn)
  bookBtn.addEventListener('click', e => {
    console.log('Inside signup function!!');

    e.target.textContent = 'Processing...';
    const tourId = e.target.dataset.tourId;
    bookTour(tourId);
  });

const alertMsg = document.querySelector('body').dataset.alert;
if (alertMsg) showAlert('success', alertMsg, 12);
