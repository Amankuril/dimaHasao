import { toast } from '../../lib/notify';

/*
 * Port of Frontend/src/modules/Hotel/utils/toastUtils.jsx. The web draws a
 * custom card with a heart; the app's toast host renders title + description.
 */
const showSaveToast = (isSaved) => {
  toast(isSaved ? 'Saved to Favorites' : 'Removed from Favorites', {
    description: isSaved ? 'You can find this hotel in your saved places.' : 'This hotel has been removed from your list.',
  });
};

export { showSaveToast };
export default showSaveToast;
