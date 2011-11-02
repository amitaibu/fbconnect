(function ($) {

/**
 * Bind init functions it facebook init.
 */
$(document).ready(function() {
  $(document).bind('fb:init', Drupal.fbconnect.init);
}); 


Drupal.fbconnect = Drupal.fbconnect || {};
Drupal.fbconnect.init = function () {
  Drupal.behaviors.fbconnect = function(context) {
    if (context != document) {
      jQuery(context).each(function() { 
        // Parse the document
        // http://developers.facebook.com/docs/reference/javascript/FB.XFBML.parse/
        FB.XFBML.parse(this); 
      });
    }
    Drupal.fbconnect.initLogoutLinks(context);
  }

  if (Drupal.settings.fbconnect.loginout_mode == 'auto') {
    FB.Event.subscribe('auth.authResponseChange', Drupal.fbconnect.reloadIfUserConnected);
  }
  
  Drupal.behaviors.fbconnect(document);
}


Drupal.fbconnect.logout = function() {
  $('#fbconnect-logout-dialog')
    .removeClass('element-invisible')
    .dialog(
      { 
        buttons: { 
          "Yes": function() {
            FB.logout(); 
            window.location.href = Drupal.settings.basePath + 'user/logout';
          },
          "No": function() {
            window.location.href = Drupal.settings.basePath + 'user/logout';
          } 
        } 
      }      
    );
  return;
  
  var t_args  = {'!site_name' : Drupal.settings.fbconnect.invite_name};
  var buttons = [
      {
        'label': Drupal.t('Facebook and !site_name', t_args),
        'click': function() {
          this.close();
          Drupal.fbconnect.logout();
        }
      }, {
        'name': 'cancel',
        'label': Drupal.t('!site_name Only', t_args),
        'click': function() {
          this.close();
          Drupal.fbconnect.logout(true);
        }
      }
  ];

  var dialog = new Drupal.fbconnect.PopupDialog({
    'title'   : Drupal.t('Logout'),
    'message' : Drupal.t('Do you also want to logout from your Facebook account?'),
    'buttons' : buttons
  });
}

Drupal.fbconnect.reloadIfUserConnected = function(state) {
  var user = Drupal.settings.fbconnect.user;
  
  if (!state.authResponse || user.uid) {
    return;
  }
  
  if (state.authResponse.uid != user.fbuid) {
    window.location.reload();
  }
};

Drupal.fbconnect.initLogoutLinks = function(context) {
  var loginout_mode = Drupal.settings.fbconnect.loginout_mode;
  var user          = Drupal.settings.fbconnect.user;
  var basePath      = Drupal.settings.basePath;
  var logout_url    = basePath + 'user/logout';
  var links         = jQuery('a[href='+ logout_url +']', context).not('.fbconnect-logout-link');
  
  if (loginout_mode == 'manual') {
    return;
  }
  
  if (!user.uid) {
    // User is anonymous.
    return;
  }
  
  if (!user.fbuid) {
    // User is not related to facebook.
  }
  
  links.addClass('fbconnect-logout-link').bind('click',function() {
    
    FB.getLoginStatus(function(response) {
      if (response.authResponse) {
        // User is logged in and connected to facebook.
        var fbuid = response.authResponse.userID;
      } 
      else {
        // No user session available.
        return;
      }
    });    
    
    if (loginout_mode == 'auto') {
      // Logout from Facebook.
      FB.logout();
      window.location.href = Drupal.settings.basePath + 'user/logout';
    }
    else {
      // Disable link.
      Drupal.fbconnect.logout();
      return false;  
    }
  });
};

/**
 * Fast registration.
 * 
 * @see fbconnect_prompt_page().
 */
Drupal.fbconnect.DoFastRegistration =  function(link) {
  FB.login(function(response) {
    if (response.authResponse && response.status == 'connected') {
      FB.api('/me/permissions', function(perms_response) {
        if(perms_response['data'][0]['email']) {
          window.location.href = link.href;
        }
      });
    }
  }, {scope:'email'});
};

Drupal.fbconnect.onLogin = function() {
  jQuery("#fbconnect-autoconnect-form").submit();
}

/**
 * Create a dialog.
 *
 * @param opts {Object} Options:
 * @see Drupal.fbconnect.PopupDialog.prototype.prepareDefaults
 *
 * @return {Object}
 */
Drupal.fbconnect.PopupDialog = function(options) {
  this.prepareDefaults(options);
  this.container = Drupal.theme('fb_popup_dialog', this.options);
  this.dialog = FB.Dialog.create({
    content : this.container,
    visible : false,
    loader  : true,
    onClose : this.__close_handler,
    closeIcon : true
  });

//  FB.XFBML.parse(dialog);

//  var popup = new FB.UI.PopupDialog(
//    oThis.options.title,
//    oThis.container,
//    oThis.options.showLoading,
//    oThis.options.hideUntilLoaded
//  );

  this.callback('load', this.dialog);
};

Drupal.fbconnect.PopupDialog.prototype.options = {};

Drupal.fbconnect.PopupDialog.prototype.createHandler = function(event, data) {
  var oThis = this;
  return function() { oThis.callback(event, data); };
};

Drupal.fbconnect.PopupDialog.prototype.callback = function(event, data) {
  data = data || {};
  switch (event) {
  case 'click':
    var btn = data;
    if (btn.click instanceof Function) btn.click.apply(this, [btn]);
    else if (btn.name == 'cancel') this.close();
    break;

  case 'close':
    this.close();
    /*var btn = this.findButton('cancel');
    if (btn) this.callback('click', btn); */
    break;

  case 'load':
    this.show();
    break;
  }
};

Drupal.fbconnect.PopupDialog.prototype.prepareDefaults = function(options) {
  var defaults = {
    'title'           : '',
    'message'         : ' - ',
    'buttons'         : {},
    'showLoading'     : false,
    'hideUntilLoaded' : false
  };
  jQuery.extend(this.options, defaults, options);

  this.__close_handler = this.createHandler('close', {});
  this.options.dialog = this;
  if (this.options.callback instanceof Function) {
    this.callback = this.options.callback;
  }
};

Drupal.fbconnect.PopupDialog.prototype.show = function() {
  if (this.dialog) {
    FB.Dialog.show(this.dialog);
  }
};

Drupal.fbconnect.PopupDialog.prototype.close = function() {
  if (this.dialog) {
    FB.Dialog.remove(this.dialog);
  }
};

Drupal.fbconnect.PopupDialog.prototype.findButton = function(name) {
  var button = null;
  jQuery.each(this.options.buttons, function(i, btn) {
    if (btn.name == name) {
      button = btn;
      return true;
    }
  });

  return button;
}

Drupal.theme.prototype.fb_popup_dialog_buttons = function(buttons, dialog) {
  buttons = buttons || {};
  var container = jQuery('<div class="dialog_buttons"></div>');

  jQuery.each(buttons, function(i, btn) {
    var button = jQuery('<input type="button" class="dialog_inputbutton">');
    if (!btn['name']) btn['name'] = i;
    if (btn.attr) button.attr(btn.attr);
    if (btn['class']) button.addClass(btn['class']);
    if (btn['name'] == 'cancel') button.addClass('dialog_inputaux');
    button.addClass('fb_button_' + i);
    button.attr('value', btn.label);
    button.click(dialog.createHandler('click', btn));
    button.appendTo(container);
  });

  return container.get(0);
};

Drupal.theme.prototype.fb_popup_dialog = function(options) {
  options = options || {buttons:{}};
  var container = document.createDocumentFragment();
  var elements  =  [
     '<h2 class="dialog_header"><span>',
    options.title.toString(),
    '</span></h2>',
       '<div class="dialog_stripes"></div>',
    '<div class="dialog_content">',
    options.message.toString(),
    '</div>'
  ];

  jQuery(elements.join("\n")).each(function() {
    container.appendChild(this);
  });
  if (options.buttons) {
    container.appendChild(
      Drupal.theme('fb_popup_dialog_buttons', options.buttons, options.dialog)
    );
  }

  return container;
};


Drupal.theme.prototype.fbml_name = function(fbuid, options) {
  var output = ['<fb:name uid="', fbuid, '"'];
  var defaults = {
    'useyou' : false,
    'linked' : false
  };

  options = jQuery.extend({}, defaults, options);

  output.push('" useyou="'+ (!!options.useyou ? 'true' : 'false') +'"');
  output.push('" linked="'+ (!!options.linked ? 'true' : 'false') +'"');
  output.push('></fb:name>');

  return output.join('');
};

Drupal.theme.prototype.fbml_profile_pic = function(fbuid, options) {
  var output = ['<fb:profile-pic uid="', fbuid, '"'];
  options = options || {};

  if (options.width)  output.push('" width="'+ options.width +'"');
  if (options.height) output.push('" height="'+ options.height +'"');
  if (options.size)   output.push('" size="'+ options.size +'"');

  output.push('" facebook-logo="'+ (!!options['facebook-logo'] ? 'true' : 'false') +'"')
  output.push('" linked="'+ (!!options.linked ? 'true' : 'false') +'"');
  output.push('></fb:profile-pic>');

  return output.join('');
};

})(jQuery);