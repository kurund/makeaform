<?php
use CRM_Makeaform_ExtensionUtil as E;

class CRM_Makeaform_Page_Creator extends CRM_Core_Page {

  public function run():void {
    CRM_Utils_System::setTitle(E::ts('Form Creator'));

    // Get form name from URL if provided (for edit mode)
    $formName = CRM_Utils_Request::retrieve('name', 'String');

    // add svelte application resources
    CRM_Core_Resources::singleton()
      ->addStyleFile('makeaform', 'dist/form-builder.css', 10, 'html-header')
      ->addScriptFile('makeaform', 'dist/form-builder.iife.js', 20, 'page-footer')
      ->addVars('makeaform', [
        'formName' => $formName,
      ]);

    parent::run();
  }

}
