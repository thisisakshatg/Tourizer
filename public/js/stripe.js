import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async tourId => {
  try {
    const stripe = Stripe(
      'pk_test_51KJeauSFiZ0hADkNacXyIvFm6e3dhpDHUiGHB9jIbr0exAeTZH1OiYb23EnvImmOWMQz9TTim4zDwji0paACoY7z003yarNxI7'
    );
    // 1) Get session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    showAlert('error', 'Checkout failed!');
  }
};
