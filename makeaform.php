<?php

require_once 'makeaform.civix.php';

use CRM_Makeaform_ExtensionUtil as E;

/**
 * Implements hook_civicrm_config().
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_config/
 */
function makeaform_civicrm_config(&$config): void {
  _makeaform_civix_civicrm_config($config);
}

/**
 * Implements hook_civicrm_install().
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_install
 */
function makeaform_civicrm_install(): void {
  _makeaform_civix_civicrm_install();
}

/**
 * Implements hook_civicrm_enable().
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_enable
 */
function makeaform_civicrm_enable(): void {
  _makeaform_civix_civicrm_enable();
}

/**
 * Implements hook_civicrm_entityTypes().
 *
 * Declare entity types provided by this module.
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_entityTypes
 */
function makeaform_civicrm_entityTypes(&$entityTypes): void {
  // Makeaform entity is auto-discovered via scan-classes mixin
}

/**
 * Implements hook_civicrm_alterAngular().
 *
 * Adds "Edit with MakeaForm" and "Create with MakeaForm" links to the afform admin list.
 */
function makeaform_civicrm_alterAngular(\Civi\Angular\Manager $angular): void {
  $changeSet = \Civi\Angular\ChangeSet::create('makeaform')
    ->alterHtml('~/afAdmin/afAdminList.html', function(\phpQueryObject $doc, $path) {
      $makeaformUrl = CRM_Utils_System::url('civicrm/admin/formcreator', NULL, FALSE, NULL, FALSE);

      // Add "Edit with MakeaForm" link to action buttons for each form
      $actionCell = $doc->find('td.text-right');
      $editLink = '<a ng-if="afform.type === \'form\' && afform.can_manage" '
        . 'ng-href="' . $makeaformUrl . '?name={{:: afform.name }}" '
        . 'class="btn btn-xs btn-info" '
        . 'title="{{:: ts(\'Edit with Make a Form builder\') }}">'
        . '{{:: ts(\'Edit with MakeaForm\') }}'
        . '</a> ';
      $actionCell->prepend($editLink);

      // Add "Create with MakeaForm" button next to the "New Form" button group
      $btnGroup = $doc->find('.btn-group.pull-right');
      $createButton = '<a ng-if="$ctrl.tab === \'form\'" '
        . 'href="' . $makeaformUrl . '" '
        . 'class="btn btn-info pull-right" '
        . 'style="margin-right: 10px;" '
        . 'title="{{:: ts(\'Create a new form with the Make a Form builder\') }}">'
        . '<i class="crm-i fa-plus" aria-hidden="true"></i> '
        . '{{:: ts(\'New with MakeaForm\') }}'
        . '</a> ';
      $btnGroup->before($createButton);
    });
  $angular->add($changeSet);
}
